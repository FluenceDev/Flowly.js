// src/ui/vanilla/ConnectionUI.js
class ConnectionUI {
    constructor(connection, svgContainer, htmlContainer, getPortWorldPositionFunction, getSimpleBezierPathFunction, getCanvasOffsetAndZoomFunction, parentUI = null) {
        this.connection = connection;
        this.svgContainer = svgContainer;
        this.htmlContainer = htmlContainer;
        this.parentUI = parentUI;

        this.getPortWorldPosition = getPortWorldPositionFunction;
        this.getSimpleBezierPath = getSimpleBezierPathFunction;
        this.getCanvasOffsetAndZoom = getCanvasOffsetAndZoomFunction;

        this.hitboxElement = this.createHitboxElement();
        this.lineElement = this.createLineElement();
        this.labelElement = null;

        if (this.connection.labelHtmlContent) {
            this.labelElement = this.createLabelElement();
        }

        this.render();

        this.hitboxElement.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (this.parentUI && typeof this.parentUI.selectConnection === 'function') {
                this.parentUI.selectConnection(this.connection.id);
            }
        });
    }

    createLabelElement() {
        const div = document.createElement('div');
        div.classList.add('flowly-connection-label');
        div.style.position = 'absolute';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.pointerEvents = 'all';
        div.style.zIndex = '20';
        div.innerHTML = this.connection.labelHtmlContent || '';

        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (this.parentUI && typeof this.parentUI.notifyConnectionLabelDoubleClick === 'function') {
                this.parentUI.notifyConnectionLabelDoubleClick(this.connection.id);
            }
        });

        return div;
    }

    updateLabel(newLabelHtmlContent) {
        this.connection.labelHtmlContent = newLabelHtmlContent;

        if (newLabelHtmlContent) {
            if (!this.labelElement) {
                this.labelElement = this.createLabelElement();
                this.htmlContainer.appendChild(this.labelElement);
            } else {
                this.labelElement.innerHTML = newLabelHtmlContent;
            }
            this.labelElement.style.display = 'block';
        } else {
            if (this.labelElement && this.labelElement.parentNode) {
                this.labelElement.parentNode.removeChild(this.labelElement);
                this.labelElement = null;
            }
        }
        this.updateLinePosition();
    }

    createHitboxElement() {
        const svgNS = "http://www.w3.org/2000/svg";
        const hitbox = document.createElementNS(svgNS, 'path');
        hitbox.classList.add('flowly-connection-hitbox');
        hitbox.setAttribute('fill', 'none');
        hitbox.setAttribute('stroke', 'transparent');
        hitbox.setAttribute('stroke-width', '16');
        hitbox.style.pointerEvents = 'stroke';
        hitbox.setAttribute('data-connection-id', this.connection.id);
        return hitbox;
    }

    createLineElement() {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, 'path');
        path.classList.add('flowly-connection'); 
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#555');
        path.setAttribute('stroke-width', '2'); 
        path.style.pointerEvents = 'stroke';
        path.setAttribute('data-connection-id', this.connection.id);
        return path;
    }

    render() {
        this.svgContainer.appendChild(this.hitboxElement);
        this.svgContainer.appendChild(this.lineElement);
        if (this.labelElement) {
            this.htmlContainer.appendChild(this.labelElement);
        }
        this.updateLinePosition();
    }

    updateLinePosition() {
        const sourcePos = this.getPortWorldPosition(
            this.connection.sourceNodeId,
            this.connection.sourceOutputId,
            'output'
        );
        const targetPos = this.getPortWorldPosition(
            this.connection.targetNodeId,
            this.connection.targetInputId,
            'input'
        );

        if (sourcePos && targetPos &&
            typeof sourcePos.x === 'number' && !isNaN(sourcePos.x) &&
            typeof sourcePos.y === 'number' && !isNaN(sourcePos.y) &&
            typeof targetPos.x === 'number' && !isNaN(targetPos.x) &&
            typeof targetPos.y === 'number' && !isNaN(targetPos.y)) {

            const pathData = this.getSimpleBezierPath(sourcePos, targetPos);
            this.lineElement.setAttribute('d', pathData);
            this.hitboxElement.setAttribute('d', pathData);

            if (this.labelElement) {
                if (!this.connection.labelHtmlContent) {
                    this.labelElement.style.display = 'none';
                } else {
                    this.labelElement.style.display = 'block';
                    const midX = (sourcePos.x + targetPos.x) / 2;
                    const midY = (sourcePos.y + targetPos.y) / 2;
                    
                    const { zoom } = this.getCanvasOffsetAndZoom();

                    this.labelElement.style.left = `${midX}px`;
                    this.labelElement.style.top = `${midY}px`;
                    this.labelElement.style.transform = `translate(-50%, -50%) scale(${zoom})`;
                }
            }

        } else {
            this.lineElement.setAttribute('d', 'M 0 0'); 
            this.hitboxElement.setAttribute('d', 'M 0 0');
            if (this.labelElement) {
                this.labelElement.style.display = 'none';
            }
        }
    }

    remove() {
        if (this.lineElement.parentNode) {
            this.lineElement.parentNode.removeChild(this.lineElement);
        }
        if (this.hitboxElement.parentNode) {
            this.hitboxElement.parentNode.removeChild(this.hitboxElement);
        }
        if (this.labelElement && this.labelElement.parentNode) {
            this.labelElement.parentNode.removeChild(this.labelElement);
        }
    }
}

export default ConnectionUI;