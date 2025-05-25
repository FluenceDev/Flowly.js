// src/ui/vanilla/NodeUI.js
import interact from 'interactjs';

class NodeUI {
    constructor(node, containerElement, core, getCanvasOffsetAndZoomFunction, parentUI, isReadOnlyGlobal) {
        this.node = node;
        this.containerElement = containerElement;
        this.core = core;
        this.getCanvasOffsetAndZoom = getCanvasOffsetAndZoomFunction;
        this.parentUI = parentUI;
        this.isReadOnlyGlobal = isReadOnlyGlobal;
        this.element = this.createNodeElement();
        
        this.render();
        this.initializeDraggable();
        this.updateDraggableStatus();

        this.element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (this.parentUI && typeof this.parentUI.notifyNodeDoubleClick === 'function') {
                this.parentUI.notifyNodeDoubleClick(this.node.id);
            }
        });
    }

    createNodeElement() {
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('flowly-node');
        nodeDiv.setAttribute('data-node-id', this.node.id);

        const isNodeEffectivelyReadOnly = this.isReadOnlyGlobal || this.node.readOnly;

        if (isNodeEffectivelyReadOnly) {
            nodeDiv.classList.add('flowly-node-readonly');
            if (this.isReadOnlyGlobal) {
                nodeDiv.classList.add('flowly-node-readonly-global');
            }
            if (this.node.readOnly) {
                nodeDiv.classList.add('flowly-node-readonly-specific');
            }
        }

        if (this.node.theme) {
            for (const key in this.node.theme) {
                nodeDiv.style.setProperty(key, this.node.theme[key]);
            }
        }

        const inputPortHtml = this.node.input ? `
            <div class="flowly-node-port flowly-node-input-port" 
                data-port-type="input" 
                data-port-id="${this.node.id}-${this.node.input.id}"
                data-port-name="${this.node.input.name}">
            </div>
        ` : '';

        const outputPortHtml = this.node.output ? `
            <div class="flowly-node-port flowly-node-output-port" 
                data-port-type="output" 
                data-port-id="${this.node.id}-${this.node.output.id}"
                data-port-name="${this.node.output.name}">
            </div>
        ` : '';

        const customContentHtml = this.node.htmlContent ? this.node.htmlContent : '<div class="flowly-node-default-content"></div>';

        const headerHtml = this.node.showHeader ? 
            `<div class="flowly-node-header">${this.node.data.name || `Node ${this.node.id}`}</div>` : '';

        nodeDiv.innerHTML = `
            ${headerHtml}
            <div class="flowly-node-body">
                <div class="flowly-node-port-container flowly-node-input-ports">
                    ${inputPortHtml}
                </div>
                <div class="flowly-node-custom-content-wrapper">
                    ${customContentHtml} 
                </div>
                <div class="flowly-node-port-container flowly-node-output-ports">
                    ${outputPortHtml}
                </div>
            </div>
        `;

        return nodeDiv;
    }

    render() {
        this.containerElement.appendChild(this.element);
        this.updatePosition();
    }

    updatePosition() {
        const { x: offsetX, y: offsetY, zoom } = this.getCanvasOffsetAndZoom();

        const screenX = this.node.x * zoom + offsetX;
        const screenY = this.node.y * zoom + offsetY;

        this.element.style.transform = `translate(${screenX}px, ${screenY}px) scale(${zoom})`;
    }

    initializeDraggable() {
        if (!this.element) {
            console.error("NodeUI element not found for dragging.");
            return;
        }
        
        interact(this.element)
            .draggable({
                preventDefault: 'auto',
                ignoreFrom: '.flowly-node-port, .flowly-node-custom-content-wrapper *',
                listeners: {
                    start: (event) => {
                        this.element.classList.add('flowly-node-dragging');
                    },
                    move: (event) => {
                        const { zoom } = this.getCanvasOffsetAndZoom();
                        this.node.x += event.dx / zoom;
                        this.node.y += event.dy / zoom;
                        this.core.updateNodePosition(this.node.id, this.node.x, this.node.y);
                        this.updatePosition();
                    },
                    end: (event) => {
                        this.element.classList.remove('flowly-node-dragging');
                    }
                }
            });
    }

    updateDraggableStatus() {
        if (!this.element) return;

        if (this.parentUI && this.parentUI.isReadOnlyGlobal !== undefined) {
            this.isReadOnlyGlobal = this.parentUI.isReadOnlyGlobal;
        }

        const isEffectivelyReadOnly = this.isReadOnlyGlobal || this.node.readOnly;
        
        interact(this.element).draggable({ enabled: !isEffectivelyReadOnly });

        if (isEffectivelyReadOnly) {
            this.element.style.cursor = 'default';
            this.element.classList.add('flowly-node-readonly');
            if (this.isReadOnlyGlobal) this.element.classList.add('flowly-node-readonly-global');
            else this.element.classList.remove('flowly-node-readonly-global');
            if (this.node.readOnly) this.element.classList.add('flowly-node-readonly-specific');
            else this.element.classList.remove('flowly-node-readonly-specific');
        } else {
            this.element.style.cursor = 'grab';
            this.element.classList.remove('flowly-node-readonly', 'flowly-node-readonly-global', 'flowly-node-readonly-specific');
        }
    }
}

export default NodeUI;