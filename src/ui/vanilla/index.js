import interact from 'interactjs';
import NodeUI from './NodeUI';
import ConnectionUI from './ConnectionUI.js';

const CSS_CLASSES = {
    NODE: 'flowly-node',
    TITLE: 'flowly-node-header',
    PORT_CONTAINER: 'flowly-node-port-container',
    PORT: 'flowly-node-port',
    INPUT_PORTS: 'flowly-node-input-ports',
    OUTPUT_PORTS: 'flowly-node-output-ports',
    TEMP_CONNECTION: 'flowly-temp-connection',
    CONNECTION: 'flowly-connection',
};

const PORT_TYPES = {
    INPUT: 'input',
    OUTPUT: 'output'
};

const BEZIER_HANDLE_OFFSET = 70;
const ZOOM_SPEED = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const PASTE_OFFSET = 20;

/**
 * Vanilla DOM-based UI for Flowly.
 */
class FlowlyVanillaUI {
    /**
     * @param {string} containerId
     * @param {*} core
     * @param {{readOnly?: boolean, background?: {type?: 'solid'|'dots', color?: string, dotColor?: string, dotSize?: number, dotSpacing?: number}}} [initialConfig]
     */
    constructor(containerId, core, initialConfig = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID '${containerId}' not found.`);
        }
        this.core = core;
        this.isReadOnlyGlobal = initialConfig.readOnly || false;
        this.nodeUIs = new Map();
        this.connectionUIs = new Map();

        this.svgContainer = this.createSvgContainer();
        this.container.appendChild(this.svgContainer);

        this.container.style.touchAction = 'none';

        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.lastPanPointerX = 0;
        this.lastPanPointerY = 0;

        this.zoom = 1.0;
        this.pointers = new Map();
        this.initialPinchDistance = null;
        this.initialZoom = 1.0;

        this.currentInteractionType = null;

        this.currentConnectionStart = null;
        this.tempLine = null;

        this.selectedNodeId = null;
        this.selectedConnectionId = null;

        this.copiedNodeData = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.backgroundOptions = {};

        this.container.classList.add('flowly-container');

        try {
            this.initialBackgroundColor = getComputedStyle(this.container).backgroundColor || '#f8f8f8';
        } catch (e) {
            this.initialBackgroundColor = '#f8f8f8';
        }
        
        this.setBackground(initialConfig.background || {});

        this.setupCoreListeners();
        this.setupInteractions();
        this.setupZoomInteractions();
        this.setupKeyboardInteractions();
        this.setupMouseTracking();
        this.updateBackgroundPattern();
    }

    /**
     * Creates the SVG container used to draw connections.
     * @returns {SVGSVGElement}
     */
    createSvgContainer() {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, 'svg');
        svg.classList.add('flowly-svg-connections');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        return svg;
    }

    /**
     * Hooks UI updates to core events.
     * @returns {void}
     */
    setupCoreListeners() {
        this.core.onNodeAdded = (node) => this.addNodeUI(node);
        this.core.onNodeRemoved = (nodeId) => this.removeNodeUI(nodeId);
        this.core.onNodeUpdated = (node) => {
            requestAnimationFrame(() => this.updateConnectionsForNode(node.id));
        };
        this.core.onConnectionAdded = (connection) => {
            requestAnimationFrame(() => this.addConnectionUI(connection));
        };
        this.core.onConnectionRemoved = (connection) => this.removeConnectionUI(connection);

        if (this.core.eventEmitter) {
            this.core.eventEmitter.on('connectionLabelChanged', ({ connection }) => {
                const connUI = this.connectionUIs.get(connection.id);
                if (connUI) {
                    connUI.updateLabel(connection.labelHtmlContent);
                }
            });

            this.core.eventEmitter.on('flowLoaded', () => {
                this.clearAllUI();
                this.renderInitial();
                this.updateAllVisuals();
            });
        }
    }

    /**
     * Adds UI element for a node.
     * @param {*} node
     */
    addNodeUI(node) {
        const nodeUI = new NodeUI(node, this.container, this.core, this.getCanvasOffsetAndZoom.bind(this), this, this.isReadOnlyGlobal);
        this.nodeUIs.set(node.id, nodeUI);
    }

    /**
     * Removes UI element for a node id.
     * @param {string} nodeId
     */
    removeNodeUI(nodeId) {
        const nodeUI = this.nodeUIs.get(nodeId);
        if (nodeUI && nodeUI.element.parentNode) {
            nodeUI.element.parentNode.removeChild(nodeUI.element);
            this.nodeUIs.delete(nodeId);
            if (this.selectedNodeId === nodeId) {
                this.clearNodeSelection();
            }
        }
    }

    /**
     * Recomputes connection paths for a node.
     * @param {string} nodeId
     */
    updateConnectionsForNode(nodeId) {
        this.connectionUIs.forEach(connUI => {
            if (connUI && connUI.connection) {
                const { sourceNodeId, targetNodeId } = connUI.connection;
                if (sourceNodeId === nodeId || targetNodeId === nodeId) {
                    connUI.updateLinePosition();
                }
            }
        });
    }

    /**
     * Updates the on-screen position for a node UI.
     * @param {*} node
     */
    updateNodeUIPosition(node) {
        const nodeUI = this.nodeUIs.get(node.id);
        if (nodeUI) {
            nodeUI.updatePosition();
        }
    }

    /**
     * Adds UI for a connection.
     * @param {*} connection
     */
    addConnectionUI(connection) {
        const connectionUI = new ConnectionUI(
            connection, 
            this.svgContainer, 
            this.container,
            this.getPortWorldPosition.bind(this), 
            this.getSimpleBezierPath.bind(this),
            this.getCanvasOffsetAndZoom.bind(this),
            this
        );
        this.connectionUIs.set(connection.id, connectionUI);
    }

    /**
     * Removes UI for a connection.
     * @param {*} connection
     */
    removeConnectionUI(connection) {
        const connectionUI = this.connectionUIs.get(connection.id);
        if (connectionUI) {
            connectionUI.remove();
            this.connectionUIs.delete(connection.id);
            if (this.selectedConnectionId === connection.id) {
                this.clearConnectionSelection();
            }
        }
    }

    /**
     * Finds the world-space position for a node port.
     * @param {string} nodeId
     * @param {string} portId
     * @param {'input'|'output'} portType
     * @returns {{x:number,y:number}|null}
     */
    getPortWorldPosition(nodeId, portId, portType) {
        const nodeUI = this.nodeUIs.get(nodeId);
        if (!nodeUI) {
            return null;
        }

        const portElement = nodeUI.element.querySelector(`[data-port-type="${portType}"][data-port-id="${portId}"]`);
        if (!portElement) {
            return null;
        }

        const rect = portElement.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        return {
            x: rect.left + (rect.width / 2) - containerRect.left,
            y: rect.top + (rect.height / 2) - containerRect.top
        };
    }

    /**
     * Builds a simple cubic bezier path between two points.
     * @param {{x:number,y:number}} start
     * @param {{x:number,y:number}} end
     * @returns {string}
     */
    getSimpleBezierPath(start, end) {
        const scaledBezierOffset = BEZIER_HANDLE_OFFSET * this.zoom;

        const cp1x = start.x + scaledBezierOffset;
        const cp1y = start.y;

        const cp2x = end.x - scaledBezierOffset;
        const cp2y = end.y;

        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
    }

    /**
     * Returns current canvas offset and zoom.
     * @returns {{x:number,y:number,zoom:number}}
     */
    getCanvasOffsetAndZoom() {
        return { x: this.canvasOffsetX, y: this.canvasOffsetY, zoom: this.zoom };
    }

    /**
     * Applies zoom centered at given container coordinates.
     * @param {number} newZoom
     * @param {number} centerX
     * @param {number} centerY
     */
    applyZoom(newZoom, centerX, centerY) {
        const oldZoom = this.zoom;
        const clampedNewZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

        if (clampedNewZoom === oldZoom) {
            return;
        }

        this.zoom = clampedNewZoom;

        const worldX = (centerX - this.canvasOffsetX) / oldZoom;
        const worldY = (centerY - this.canvasOffsetY) / oldZoom;

        this.canvasOffsetX = centerX - (worldX * this.zoom);
        this.canvasOffsetY = centerY - (worldY * this.zoom);

        this.updateAllVisuals();
    }

    /**
     * Re-renders visuals for nodes, connections and background.
     * @returns {void}
     */
    updateAllVisuals() {
        this.nodeUIs.forEach(nodeUI => nodeUI.updatePosition());
        this.connectionUIs.forEach(connUI => connUI.updateLinePosition());
        this.updateBackgroundPattern();
    }

    /**
     * Clears node selection state.
     */
    clearNodeSelection() {
        if (this.selectedNodeId) {
            const nodeUI = this.nodeUIs.get(this.selectedNodeId);
            if (nodeUI && nodeUI.element) {
                nodeUI.element.classList.remove('selected');
            }
            this.selectedNodeId = null;
        }
    }

    /**
     * Selects a node by id.
     * @param {string} nodeId
     */
    selectNode(nodeId) {
        this.clearNodeSelection();
        this.clearConnectionSelection();

        const nodeUI = this.nodeUIs.get(nodeId);
        if (nodeUI && nodeUI.element) {
            nodeUI.element.classList.add('selected');
            this.selectedNodeId = nodeId;
        }
    }

    /**
     * Clears connection selection state.
     */
    clearConnectionSelection() {
        if (this.selectedConnectionId) {
            const connUI = this.connectionUIs.get(this.selectedConnectionId);
            if (connUI && connUI.lineElement) {
                connUI.lineElement.classList.remove('selected');
            }
            this.selectedConnectionId = null;
        }
    }

    /**
     * Selects a connection by id.
     * @param {string} connectionId
     */
    selectConnection(connectionId) {
        this.clearNodeSelection();
        this.clearConnectionSelection();

        const connUI = this.connectionUIs.get(connectionId);
        if (connUI && connUI.lineElement) {
            connUI.lineElement.classList.add('selected');
            this.selectedConnectionId = connectionId;
        }
    }

    /**
     * Sets up pointer interactions for pan and connection drawing.
     */
    setupInteractions() {
        this.tempLine = null;
        this.currentConnectionStart = null;

        this.container.addEventListener('pointerdown', (e) => {
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            const target = e.target;
            const clickedNodeElement = target.closest(`.${CSS_CLASSES.NODE}`);
            const clickedConnectionElement = target.closest(`.${CSS_CLASSES.CONNECTION}`);
            const clickedLabelElement = target.closest('.flowly-connection-label');

            if (clickedLabelElement) {
                return;
            }

            if (clickedNodeElement) {
                const clickedNodeId = clickedNodeElement.dataset.nodeId;
                if (this.selectedNodeId !== clickedNodeId) {
                    this.selectNode(clickedNodeId);
                }
            } else if (clickedConnectionElement) {
                const clickedConnectionId = clickedConnectionElement.dataset.connectionId;
                if (this.selectedConnectionId !== clickedConnectionId) {
                    this.selectConnection(clickedConnectionId);
                }
            } else {
                this.clearNodeSelection();
                this.clearConnectionSelection();
            }

            if (this.isReadOnlyGlobal && 
                !(target.classList.contains(CSS_CLASSES.PORT) && target.dataset.portType === PORT_TYPES.OUTPUT) &&
                !clickedNodeElement
            ) {
                if (!clickedNodeElement && !target.classList.contains(CSS_CLASSES.PORT) && !target.closest(`.${CSS_CLASSES.CONNECTION}`) && !clickedLabelElement) {
                } else {
                }
            }

            if (e.pointerType === 'touch' && this.pointers.size === 2) {
                e.preventDefault();
                this.currentInteractionType = 'pinch';
                const [p1, p2] = Array.from(this.pointers.values());
                this.initialPinchDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                this.initialZoom = this.zoom;
                this.container.setPointerCapture(e.pointerId);
                return;
            }

            if (target.classList.contains(CSS_CLASSES.PORT) && target.dataset.portType === PORT_TYPES.OUTPUT) {
                if (this.isReadOnlyGlobal) return;

                const sourceNodeId = target.closest(`.${CSS_CLASSES.NODE}`).dataset.nodeId;
                const sourceNodeCore = this.core.getById(sourceNodeId);
                if (sourceNodeCore && sourceNodeCore.readOnly) {
                    console.warn(`Node ${sourceNodeId} is read-only. Cannot start connection from it.`);
                    return;
                }

                e.preventDefault();
                this.currentInteractionType = 'connection';
                const sourceOutputId = target.dataset.portId;
                this.currentConnectionStart = { sourceNodeId, sourceOutputId };

                const svgNS = "http://www.w3.org/2000/svg";
                this.tempLine = document.createElementNS(svgNS, 'path');
                this.tempLine.classList.add(CSS_CLASSES.TEMP_CONNECTION);
                this.tempLine.setAttribute('fill', 'none');
                this.tempLine.setAttribute('stroke', 'blue');
                this.tempLine.setAttribute('stroke-width', '2');
                this.tempLine.setAttribute('stroke-dasharray', '5,5');
                this.tempLine.style.pointerEvents = 'auto';
                this.tempLine.style.zIndex = '100';

                const startPos = this.getPortWorldPosition(sourceNodeId, sourceOutputId, PORT_TYPES.OUTPUT);
                if (startPos) {
                    this.tempLine.setAttribute('d', `M ${startPos.x} ${startPos.y} L ${startPos.x} ${startPos.y}`);
                    this.svgContainer.appendChild(this.tempLine);
                }
                this.container.setPointerCapture(e.pointerId);
                return;
            }

            if (clickedNodeElement) {
                return;
            }

            if (this.pointers.size === 1) {
                e.preventDefault();
                this.currentInteractionType = 'pan';
                this.lastPanPointerX = e.clientX;
                this.lastPanPointerY = e.clientY;
                this.container.setPointerCapture(e.pointerId);
                this.container.classList.add('panning');
                return;
            }
        });

        this.container.addEventListener('pointermove', (e) => {
            if (this.currentInteractionType === 'pinch' ||
                this.currentInteractionType === 'pan' ||
                this.currentInteractionType === 'connection') {
                e.preventDefault();
            }

            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (this.isReadOnlyGlobal && this.currentInteractionType === 'connection') {
                return;
            }

            if (this.currentInteractionType === 'pinch') {
                if (this.pointers.size === 2) {
                    const currentPinchDistance = this.getPinchDistance();
                    if (this.initialPinchDistance) {
                        const newZoom = this.initialZoom * (currentPinchDistance / this.initialPinchDistance);
                        const [p1Id, p2Id] = Array.from(this.pointers.keys());
                        const p1 = this.pointers.get(p1Id);
                        const p2 = this.pointers.get(p2Id);
                        const centerX = (p1.x + p2.x) / 2;
                        const centerY = (p1.y + p2.y) / 2;
                        this.applyZoom(newZoom, centerX, centerY);
                    }
                }
            } else if (this.currentInteractionType === 'pan') {
                const dx = e.clientX - this.lastPanPointerX;
                const dy = e.clientY - this.lastPanPointerY;

                this.canvasOffsetX += dx;
                this.canvasOffsetY += dy;

                this.lastPanPointerX = e.clientX;
                this.lastPanPointerY = e.clientY;

                this.updateAllVisuals();
            } else if (this.currentInteractionType === 'connection') {
                const currentConnectionInfo = this.currentConnectionStart;
                const tempLineElement = this.tempLine;

                if (!currentConnectionInfo || !tempLineElement) {
                    return;
                }

                requestAnimationFrame(() => {
                    if (!currentConnectionInfo || !tempLineElement) {
                        return;
                    }

                    const containerRect = this.container.getBoundingClientRect();
                    const mouseX = e.clientX - containerRect.left;
                    const mouseY = e.clientY - containerRect.top;

                    const startPos = this.getPortWorldPosition(currentConnectionInfo.sourceNodeId, currentConnectionInfo.sourceOutputId, PORT_TYPES.OUTPUT);
                    if (startPos) {
                        const curvedPathData = this.getSimpleBezierPath(startPos, { x: mouseX, y: mouseY });
                        tempLineElement.setAttribute('d', curvedPathData);
                    }
                });
            }
        });

        this.container.addEventListener('pointerup', (e) => {
            if (e.pointerId && this.container.hasPointerCapture(e.pointerId)) {
                this.container.releasePointerCapture(e.pointerId);
            }

            const wasPinch = this.currentInteractionType === 'pinch';
            const wasPan = this.currentInteractionType === 'pan';
            const wasConnection = this.currentInteractionType === 'connection';

            this.pointers.delete(e.pointerId);

            if (wasPinch) {
                if (this.pointers.size < 2) {
                    this.initialPinchDistance = null;
                    this.initialZoom = 1.0;
                }
            } else if (wasPan) {
                this.container.classList.remove('panning');
            } else if (wasConnection && !this.isReadOnlyGlobal) {
                if (this.tempLine && this.tempLine.parentNode) {
                    this.tempLine.parentNode.removeChild(this.tempLine);
                    this.tempLine = null;
                }

                const clientX = e.clientX;
                const clientY = e.clientY;
                const targetElementAtRelease = document.elementFromPoint(clientX, clientY);
                const targetPortElement = targetElementAtRelease ? targetElementAtRelease.closest(`.${CSS_CLASSES.PORT}`) : null;

                if (this.currentConnectionStart && targetPortElement && targetPortElement.dataset.portType === PORT_TYPES.INPUT) {
                    const targetNodeId = targetPortElement.closest(`.${CSS_CLASSES.NODE}`).dataset.nodeId;
                    const targetNodeCore = this.core.getById(targetNodeId);

                    if (targetNodeCore && targetNodeCore.readOnly) {
                        console.warn(`Node ${targetNodeId} is read-only. Cannot connect to it.`);
                        if (this.tempLine && this.tempLine.parentNode) {
                            this.tempLine.parentNode.removeChild(this.tempLine);
                            this.tempLine = null;
                        }
                        this.currentConnectionStart = null;
                        return;
                    }
                    const sourceNodeCore = this.core.getById(this.currentConnectionStart.sourceNodeId);
                    if (sourceNodeCore && sourceNodeCore.readOnly) {
                        console.warn(`Source Node ${sourceNodeCore.id} is read-only. Cannot complete connection.`);
                        if (this.tempLine && this.tempLine.parentNode) {
                            this.tempLine.parentNode.removeChild(this.tempLine);
                            this.tempLine = null;
                        }
                        this.currentConnectionStart = null;
                        return;
                    }

                    this.core.addConnection(
                        this.currentConnectionStart.sourceNodeId,
                        this.currentConnectionStart.sourceOutputId,
                        targetNodeId,
                        targetPortElement.dataset.portId
                    );
                }
                this.currentConnectionStart = null;
            }

            if (this.pointers.size === 0) {
                this.currentInteractionType = null;
                this.container.classList.remove('panning');
            }

            if (wasPinch || wasPan || wasConnection) {
                e.preventDefault();
            }
        });

        this.container.addEventListener('pointercancel', (e) => {
            if (e.pointerId && this.container.hasPointerCapture(e.pointerId)) {
                this.container.releasePointerCapture(e.pointerId);
            }
            this.pointers.delete(e.pointerId);
            if (this.pointers.size === 0) {
                this.currentInteractionType = null;
                this.initialPinchDistance = null;
                this.initialZoom = 1.0;
                if (this.tempLine && this.tempLine.parentNode) {
                    this.tempLine.parentNode.removeChild(this.tempLine);
                    this.tempLine = null;
                }
                this.currentConnectionStart = null;
                this.container.classList.remove('panning');
            }
        });
    }

    /**
     * Sets up wheel-zoom interactions.
     */
    setupZoomInteractions() {
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            const containerRect = this.container.getBoundingClientRect();
            const clientX = e.clientX - containerRect.left;
            const clientY = e.clientY - containerRect.top;

            let newZoom = this.zoom;
            if (e.deltaY < 0) {
                newZoom += ZOOM_SPEED;
            } else {
                newZoom -= ZOOM_SPEED;
            }

            this.applyZoom(newZoom, clientX, clientY);
        }, { passive: false });
    }

    /**
     * Sets up copy/paste and delete keyboard interactions.
     */
    setupKeyboardInteractions() {
        document.addEventListener('keydown', (e) => {
            if (this.isReadOnlyGlobal) {
                if (e.key === 'Backspace' || e.key === 'Delete' || ((e.ctrlKey || e.metaKey) && e.key === 'v')) {
                    e.preventDefault();
                }
                if (!((e.ctrlKey || e.metaKey) && e.key === 'c')) {
                    return;
                }
            }

            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                if (this.isReadOnlyGlobal) return;

                if (this.selectedNodeId) {
                    const node = this.core.getById(this.selectedNodeId);
                    if (node && node.readOnly) {
                        console.warn(`Node ${this.selectedNodeId} is read-only. Cannot delete.`);
                        return;
                    }
                    this.core.removeNode(this.selectedNodeId);
                    this.clearNodeSelection();
                } else if (this.selectedConnectionId) {
                    this.core.removeConnection(this.selectedConnectionId);
                    this.clearConnectionSelection();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                if (this.selectedNodeId) {
                    const nodeToCopy = this.core.getNode(this.selectedNodeId);
                    if (nodeToCopy) {
                        this.copiedNodeData = {
                            data: JSON.parse(JSON.stringify(nodeToCopy.data || {})),
                            htmlContent: nodeToCopy.htmlContent,
                            showHeader: nodeToCopy.showHeader,
                            input: nodeToCopy.input ? JSON.parse(JSON.stringify(nodeToCopy.input)) : null,
                            output: nodeToCopy.output ? JSON.parse(JSON.stringify(nodeToCopy.output)) : null,
                            theme: nodeToCopy.theme ? JSON.parse(JSON.stringify(nodeToCopy.theme)) : null,
                            originalNode: nodeToCopy 
                        };
                        this.core.eventEmitter.emit('nodeCopied', this.copiedNodeData.originalNode);
                    }
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (this.isReadOnlyGlobal) return;
                e.preventDefault();
                if (this.copiedNodeData) {
                    const pasteXClient = this.lastMouseX;
                    const pasteYClient = this.lastMouseY;

                    const containerRect = this.container.getBoundingClientRect();
                    const mouseXRelativeToContainer = pasteXClient - containerRect.left;
                    const mouseYRelativeToContainer = pasteYClient - containerRect.top;

                    const worldX = (mouseXRelativeToContainer - this.canvasOffsetX) / this.zoom;
                    const worldY = (mouseYRelativeToContainer - this.canvasOffsetY) / this.zoom;

                    const nodeConfig = {
                        posX: worldX + PASTE_OFFSET,
                        posY: worldY + PASTE_OFFSET,
                        data: this.copiedNodeData.data,
                        htmlContent: this.copiedNodeData.htmlContent,
                        showHeader: this.copiedNodeData.showHeader,
                        input: this.copiedNodeData.input,
                        output: this.copiedNodeData.output,
                        theme: this.copiedNodeData.theme
                    };

                    const pastedNodeBase = this.core.addNode(nodeConfig);
                    if (pastedNodeBase) {
                        const fullPastedNode = this.core.getNode(pastedNodeBase.id);
                        this.core.eventEmitter.emit('nodePasted', fullPastedNode);
                    }
                }
            }
        });
    }

    /**
     * Tracks last mouse position to support paste near cursor.
     */
    setupMouseTracking() {
        this.container.addEventListener('mousemove', (e) => {
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
    }

    /**
     * Calculates distance between two touch pointers.
     * @returns {number|null}
     */
    getPinchDistance() {
        if (this.pointers.size !== 2) return null;
        const [p1Id, p2Id] = Array.from(this.pointers.keys());
        const p1 = this.pointers.get(p1Id);
        const p2 = this.pointers.get(p2Id);
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Renders nodes and connections currently present in core.
     */
    renderInitial() {
        this.core.getAllNodes().forEach(node => this.addNodeUI(node));
        requestAnimationFrame(() => {
            this.core.getAllConnections().forEach(connection => this.addConnectionUI(connection));
        });
    }

    /**
     * Sets background rendering options.
     * @param {{type?: 'solid'|'dots', color?: string, dotColor?: string, dotSize?: number, dotSpacing?: number}} [options]
     */
    setBackground(options = {}) {
        const defaults = {
            type: 'solid',
            color: this.initialBackgroundColor,
            dotColor: '#888',
            dotSize: 2,
            dotSpacing: 20
        };

        this.backgroundOptions = { ...defaults, ...options };

        this.container.style.backgroundColor = this.backgroundOptions.color;

        if (this.backgroundOptions.type === 'dots') {
            this.container.classList.add('flowly-background-dots');
        } else {
            this.container.classList.remove('flowly-background-dots');
            this.container.style.backgroundImage = '';
            this.container.style.backgroundSize = '';
            this.container.style.backgroundPosition = '';
        }
        this.updateBackgroundPattern();
    }

    /**
     * Updates background pattern to reflect zoom/offset.
     */
    updateBackgroundPattern() {
        if (this.backgroundOptions.type === 'dots') {
            const scaledDotSize = Math.max(0.5, this.backgroundOptions.dotSize * this.zoom);
            const scaledDotSpacing = this.backgroundOptions.dotSpacing * this.zoom;

            if (scaledDotSpacing < 5) {
                this.container.style.backgroundImage = '';
                return;
            }

            this.container.style.backgroundImage = `radial-gradient(${this.backgroundOptions.dotColor} ${scaledDotSize}px, transparent ${scaledDotSize}px)`;
            this.container.style.backgroundSize = `${scaledDotSpacing}px ${scaledDotSpacing}px`;
            this.container.style.backgroundPosition = `${this.canvasOffsetX}px ${this.canvasOffsetY}px`;
        } else {
            this.container.style.backgroundImage = '';
            this.container.style.backgroundSize = '';
            this.container.style.backgroundPosition = '';
        }
    }

    /**
     * Notifies subscribers about node double-click.
     * @param {string} nodeId
     */
    notifyNodeDoubleClick(nodeId) {
        if (this.core && this.core.eventEmitter) {
            const node = this.core.getById(nodeId);
            if (node) {
                this.core.eventEmitter.emit('nodeDoubleClick', node);
            }
        }
    }

    /**
     * Notifies subscribers about connection label double-click.
     * @param {string} connectionId
     */
    notifyConnectionLabelDoubleClick(connectionId) {
        if (this.core && this.core.eventEmitter) {
            this.core.eventEmitter.emit('connectionLabelDoubleClick', connectionId);
        }
    }

    /**
     * Removes all UI elements for nodes and connections.
     */
    clearAllUI() {
        this.nodeUIs.forEach(nodeUI => {
            if (nodeUI.element && nodeUI.element.parentNode) {
                nodeUI.element.parentNode.removeChild(nodeUI.element);
            }
        });
        this.nodeUIs.clear();

        this.connectionUIs.forEach(connUI => {
            connUI.remove();
        });
        this.connectionUIs.clear();
    }

    /**
     * Sets global read-only mode for UI and updates interactability.
     * @param {boolean} isReadOnly
     */
    setReadOnly(isReadOnly) {
        this.isReadOnlyGlobal = !!isReadOnly;

        this.nodeUIs.forEach(nodeUI => {
            nodeUI.updateDraggableStatus();
        });

        if (this.isReadOnlyGlobal) {
            if (this.currentInteractionType === 'connection' && this.tempLine) {
                if (this.tempLine.parentNode) {
                    this.tempLine.parentNode.removeChild(this.tempLine);
                }
                this.tempLine = null;
                this.currentConnectionStart = null;
            }
            this.container.classList.remove('panning');
        } else {
        }
    }
}

export default FlowlyVanillaUI;