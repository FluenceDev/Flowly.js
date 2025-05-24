// src/ui/vanilla/NodeUI.js

class NodeUI {
    constructor(node, containerElement, core, getCanvasOffsetAndZoomFunction) {
        this.node = node;
        this.containerElement = containerElement;
        this.core = core;
        this.getCanvasOffsetAndZoom = getCanvasOffsetAndZoomFunction;
        this.element = this.createNodeElement();
        this.render();
    }

    createNodeElement() {
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('flowly-node');
        nodeDiv.setAttribute('data-node-id', this.node.id);
        nodeDiv.style.touchAction = 'none';

        nodeDiv.innerHTML = `
            <div class="flowly-node-header">${this.node.data.name || `Node ${this.node.id}`}</div>
            <div class="flowly-node-body">
                <div class="flowly-node-port-container flowly-node-input-ports">
                    <div class="flowly-node-port flowly-node-input-port" data-port-type="input" data-port-id="${this.node.id}-input"></div>
                </div>
                <div class="flowly-node-port-container flowly-node-output-ports">
                    <div class="flowly-node-port flowly-node-output-port" data-port-type="output" data-port-id="${this.node.id}-output"></div>
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

    enableDragging(interact) {
        if (!this.element) {
            console.error("NodeUI element not found for dragging.");
            return;
        }

        interact(this.element).unset();

        interact(this.element)
            .draggable({
                preventDefault: 'always',
                ignoreFrom: '.flowly-node-port',
                listeners: {
                    move: (event) => {
                        const { zoom } = this.getCanvasOffsetAndZoom();
                        this.node.x += event.dx / zoom;
                        this.node.y += event.dy / zoom;
                        this.core.updateNodePosition(this.node.id, this.node.x, this.node.y);
                        this.updatePosition();
                    },
                    end: (event) => {
                    }
                }
            });
    }
}

export default NodeUI;