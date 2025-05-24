class Connection {
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