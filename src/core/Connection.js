class Connection {
    constructor(id, sourceNodeId, sourceOutputId, targetNodeId, targetInputId) {
        this.id = id;
        this.sourceNodeId = sourceNodeId;
        this.sourceOutputId = sourceOutputId;
        this.targetNodeId = targetNodeId;
        this.targetInputId = targetInputId;
    }
}

export default Connection;