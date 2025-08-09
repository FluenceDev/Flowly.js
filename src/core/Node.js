/**
 * @typedef {Object} FlowlyPort
 * @property {string} id
 * @property {string} name
 * @property {number} limit
 */

/**
 * Represents a node in the Flowly graph.
 */
class Node {
    /**
     * @param {string} id
     * @param {number} x
     * @param {number} y
     * @param {Object} [data]
     * @param {FlowlyPort|null} [input]
     * @param {FlowlyPort|null} [output]
     * @param {string|null} [htmlContent]
     * @param {boolean} [showHeader]
     * @param {boolean} [readOnly]
     */
    constructor(id, x, y, data = {}, input = null, output = null, htmlContent = null, showHeader = true, readOnly = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.data = data;
        this.htmlContent = htmlContent;
        this.showHeader = showHeader;
        this.readOnly = !!readOnly;

        this.input = input ? {
            ...input,
            id: input.id || 'input',
            name: input.name || 'Input',
            limit: input.limit === undefined || input.limit === null || Number.isNaN(parseInt(input.limit, 10)) ? Infinity : parseInt(input.limit, 10)
        } : null;

        this.output = output ? {
            ...output,
            id: output.id || 'output',
            name: output.name || 'Output',
            limit: output.limit === undefined || output.limit === null || Number.isNaN(parseInt(output.limit, 10)) ? Infinity : parseInt(output.limit, 10)
        } : null;
    }

    /**
     * Updates this node's position.
     * @param {number} x
     * @param {number} y
     * @returns {void}
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Sets the custom HTML content for this node.
     * @param {string|null} newHtmlContent
     * @returns {void}
     */
    setHtmlContent(newHtmlContent) {
        this.htmlContent = newHtmlContent;
    }
}

export default Node;