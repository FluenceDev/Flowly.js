// src/ui/vanilla/Connection.js
class ConnectionUI {
    constructor(connection, svgContainer, getPortWorldPositionFunction, getSimpleBezierPathFunction) {
        this.connection = connection;
        this.svgContainer = svgContainer;

        this.getPortWorldPosition = getPortWorldPositionFunction;
        this.getSimpleBezierPath = getSimpleBezierPathFunction;

        this.lineElement = this.createLineElement();
        this.render();
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
        this.svgContainer.appendChild(this.lineElement);
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
        } else {

            this.lineElement.setAttribute('d', 'M 0 0'); 
            console.warn(`Flowly: Could not draw connection for ID ${this.connection.id}. Source or target position invalid.`);
        }
    }

    remove() {
        if (this.lineElement.parentNode) {
            this.lineElement.parentNode.removeChild(this.lineElement);
        }
    }
}

export default ConnectionUI;