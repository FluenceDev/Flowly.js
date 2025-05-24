// src/core/Flowly.js
import Node from './Node';
import Connection from './Connection';

class FlowlyCore {
    constructor() {
        this.nodes = new Map();
        this.connections = new Map();
        this.nextNodeId = 1;
        this.nextConnectionId = 1;

        this.onNodeAdded = () => {};
        this.onNodeRemoved = () => {};
        this.onNodeMoved = () => {};
        this.onConnectionAdded = () => {};
        this.onConnectionRemoved = () => {};
    }

    addNode(x, y, data = {}, inputs = [], outputs = []) {
        const id = `node-${this.nextNodeId++}`;
        const newNode = new Node(id, x, y, data, inputs, outputs);
        this.nodes.set(id, newNode);
        this.onNodeAdded(newNode);
        return newNode;
    }

    removeNode(nodeId) {
        if (this.nodes.has(nodeId)) {
            this.nodes.delete(nodeId);
            this.connections.forEach((conn, connId) => {
                if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
                    this.connections.delete(connId);
                    this.onConnectionRemoved(conn);
                }
            });
            this.onNodeRemoved(nodeId);
            return true;
        }
        return false;
    }

    updateNodePosition(nodeId, newX, newY) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.setPosition(newX, newY);
            this.onNodeMoved(node);
            return true;
        }
        return false;
    }

    addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId) {
        if (!this.nodes.has(sourceNodeId) || !this.nodes.has(targetNodeId)) {
            console.warn('Source or target node not found for connection.');
            return null;
        }

        const id = `conn-${this.nextConnectionId++}`;
        const newConnection = new Connection(id, sourceNodeId, sourceOutputId, targetNodeId, targetInputId);
        this.connections.set(id, newConnection);
        this.onConnectionAdded(newConnection);
        return newConnection;
    }

    removeConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            const connection = this.connections.get(connectionId);
            this.connections.delete(connectionId);
            this.onConnectionRemoved(connection);
            return true;
        }
        return false;
    }

    getNodes() {
        return Array.from(this.nodes.values());
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }

    getConnections() {
        return Array.from(this.connections.values());
    }
}

export default FlowlyCore;