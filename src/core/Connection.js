/**
 * Represents a connection between two nodes in the Flowly graph.
 */
class Connection {
    /**
     * @param {string} id
     * @param {string} sourceNodeId
     * @param {string} sourceOutputId
     * @param {string} targetNodeId
     * @param {string} targetInputId
     * @param {string|null} [labelHtmlContent]
     */
    constructor(id, sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent = null) {
        this.id = id;
        this.sourceNodeId = sourceNodeId;
        this.sourceOutputId = sourceOutputId;
        this.targetNodeId = targetNodeId;
        this.targetInputId = targetInputId;
        this.labelHtmlContent = labelHtmlContent;
    }
}

export default Connection;