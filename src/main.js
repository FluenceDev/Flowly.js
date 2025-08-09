import FlowlyCore from './core/Flowly';
import FlowlyVanillaUI from './ui/vanilla';

class Flowly {
    /**
     * @param {string} containerId
     * @param {{readOnly?: boolean, background?: any}} [options]
     */
    constructor(containerId, options = {}) {
        this.core = new FlowlyCore();
        this.ui = new FlowlyVanillaUI(containerId, this.core, options);
        this.core.setGlobalReadOnly(options.readOnly || false);
        this.ui.renderInitial();
    }

    /**
     * Sets global read-only state.
     * @param {boolean} isReadOnly
     * @returns {this}
     */
    setReadOnly(isReadOnly) {
        const readOnlyState = !!isReadOnly;
        this.core.setGlobalReadOnly(readOnlyState);
        if (this.ui && typeof this.ui.setReadOnly === 'function') {
            this.ui.setReadOnly(readOnlyState);
        }
        return this;
    }

    /**
     * Subscribes to a Flowly event.
     * @param {string} eventName
     * @param {Function} listener
     * @returns {this}
     */
    on(eventName, listener) {
        if (this.core && this.core.eventEmitter) {
            this.core.eventEmitter.on(eventName, listener);
        } else {
            console.warn("Attempted to register event listener before core is initialized.");
        }
        return this;
    }

    /**
     * Unsubscribes a listener from an event.
     * @param {string} eventName
     * @param {Function} listener
     * @returns {this}
     */
    off(eventName, listener) {
        if (this.core && this.core.eventEmitter) {
            this.core.eventEmitter.off(eventName, listener);
        } else {
            console.warn("Attempted to unregister event listener before core is initialized.");
        }
        return this;
    }

    /**
     * Applies CSS variables to the document root.
     * @param {Record<string,string>} themeObj
     * @returns {void}
     */
    setTheme(themeObj) {
        for (const key in themeObj) {
            document.documentElement.style.setProperty(key, themeObj[key]);
        }
    }

    /**
     * Sets the background options for the UI.
     * @param {any} options
     * @returns {void}
     */
    setBackground(options) {
        if (this.ui && typeof this.ui.setBackground === 'function') {
            this.ui.setBackground(options);
        } else {
            console.warn("UI não suporta setBackground ou não está inicializada.");
        }
    }

    /**
     * Adds a node using the core engine.
     * @param {any} config
     * @returns {import('./core/Node').default|null}
     */
    addNode(config) {
        return this.core.addNode(config);
    }

    /**
     * Removes a node by id.
     * @param {string} nodeId
     * @returns {boolean}
     */
    removeNode(nodeId) {
        return this.core.removeNode(nodeId);
    }

    /**
     * Gets a node by id with connections.
     * @param {string} nodeId
     */
    getById(nodeId) {
        return this.core.getById(nodeId);
    }

    /**
     * Returns all nodes with connections.
     */
    getAllNodes() {
        return this.core.getAllNodes();
    }

    /**
     * Returns incoming and outgoing connections for a node id.
     * @param {string} nodeId
     */
    getConnections(nodeId) {
        return this.core.getConnections(nodeId);
    }

    /**
     * Returns neighboring nodes connected to a node id.
     * @param {string} nodeId
     */
    getConnectedNodes(nodeId) {
        return this.core.getConnectedNodes(nodeId);
    }

    /**
     * Returns all connections.
     */
    getAllConnections() {
        return this.core.getAllConnections();
    }

    /**
     * Updates a node and re-renders UI if needed.
     * @param {string} nodeId
     * @param {any} newData
     * @returns {boolean}
     */
    updateNode(nodeId, newData) {
        const result = this.core.updateNode(nodeId, newData);

        if (result && 
            (newData.htmlContent !== undefined || 
             newData.showHeader !== undefined || 
             newData.name !== undefined || 
             newData.data !== undefined)
        ) {
            const node = this.core.getNode(nodeId);
            if (node) {
                this.ui.removeNodeUI(nodeId);
                this.ui.addNodeUI(node);
            }
        }
        return result;
    }

    /**
     * Adds a connection. Supports overloaded signatures.
     * @returns {import('./core/Connection').default|null}
     */
    addConnection(...args) {
        let sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent = null;

        if (args.length === 2 || (args.length === 3 && typeof args[2] === 'string')) {
            sourceNodeId = args[0];
            targetNodeId = args[1];
            if (args.length === 3) {
                labelHtmlContent = args[2];
            }

            const sourceNode = this.core.getNode(sourceNodeId);
            const targetNode = this.core.getNode(targetNodeId);

            if (!sourceNode) {
                console.warn(`addConnection: Source node with id "${sourceNodeId}" not found.`);
                return null;
            }
            if (!targetNode) {
                console.warn(`addConnection: Target node with id "${targetNodeId}" not found.`);
                return null;
            }

            if (!sourceNode.output || !sourceNode.output.id) {
                console.warn(`addConnection: Source node "${sourceNodeId}" does not have a default output port defined or it lacks an id.`);
                return null;
            }
            if (!targetNode.input || !targetNode.input.id) {
                console.warn(`addConnection: Target node "${targetNodeId}" does not have a default input port defined or it lacks an id.`);
                return null;
            }

            sourceOutputId = `${sourceNodeId}-${sourceNode.output.id}`;
            targetInputId = `${targetNodeId}-${targetNode.input.id}`;

        } else if (args.length === 4 || args.length === 5) {
            sourceNodeId = args[0];
            sourceOutputId = args[1];
            targetNodeId = args[2];
            targetInputId = args[3];
            if (args.length === 5) {
                labelHtmlContent = args[4];
            }
        } else {
            console.error('addConnection: Invalid number of arguments.');
            return null;
        }

        return this.core.addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent);
    }

    /**
     * Removes a connection by id.
     * @param {string} connectionId
     * @returns {boolean}
     */
    removeConnection(connectionId) {
        return this.core.removeConnection(connectionId);
    }

    /**
     * Updates a connection label HTML.
     * @param {string} connectionId
     * @param {string|null} labelHtmlContent
     * @returns {boolean}
     */
    addLabelToConnection(connectionId, labelHtmlContent) {
        return this.core.updateConnectionLabel(connectionId, labelHtmlContent);
    }

    /**
     * Serializes current flow.
     * @returns {string}
     */
    toJSON() {
        return this.core.toJSON();
    }

    /**
     * Loads flow from JSON.
     * @param {string|Object} json
     */
    fromJSON(json) {
        this.core.fromJSON(json);
    }
}

export default Flowly;