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

    generateUniqueNodeId(preferredId = null) {
        if (preferredId && !this.nodes.has(preferredId)) {
            return preferredId;
        }

        let candidateId;
        do {
            candidateId = `node-${this.nextNodeId++}`;
        } while (this.nodes.has(candidateId));

        return candidateId;
    }

    addNode(config) {
        const {
            posX,
            posY,
            id,
            name,
            data = {},
            input,
            output,
            theme,
            htmlContent,
            showHeader = true
        } = config;

        const nodeId = this.generateUniqueNodeId(id);

        if (name && !data.name) {
            data.name = name;
        }

        const newNode = new Node(nodeId, posX, posY, data, input, output, htmlContent, showHeader);
        if (theme) newNode.theme = theme;
        this.nodes.set(nodeId, newNode);
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

        const hasDuplicate = Array.from(this.connections.values()).some(conn => 
            conn.sourceNodeId === sourceNodeId && 
            conn.sourceOutputId === sourceOutputId &&
            conn.targetNodeId === targetNodeId && 
            conn.targetInputId === targetInputId
        );

        if (hasDuplicate) {
            console.warn('Connection already exists.');
            return null;
        }

        if (sourceNodeId === targetNodeId) {
            console.warn('Self connections are not allowed.');
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

    getConnections(nodeId) {
        // Retorna as conexões de input e output relacionadas ao node
        const inputs = [];
        const outputs = [];
        for (const conn of this.connections.values()) {
            if (conn.targetNodeId === nodeId) inputs.push(conn);
            if (conn.sourceNodeId === nodeId) outputs.push(conn);
        }
        return { inputs, outputs };
    }

    getNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            // Enriquecer o nó com suas conexões
            const nodeConnections = this.getConnections(nodeId);
            return {
                ...node, // Copia todas as propriedades do nó original
                connections: nodeConnections // Adiciona as conexões
            };
        }
        return undefined;
    }

    getNodes() {
        const allNodes = Array.from(this.nodes.values());
        // Enriquecer cada nó com suas conexões
        return allNodes.map(node => {
            const nodeConnections = this.getConnections(node.id);
            return {
                ...node,
                connections: nodeConnections
            };
        });
    }

    getAllConnections() {
        return Array.from(this.connections.values());
    }

    // --- MÉTODOS UTILITÁRIOS ---
    getById(nodeId) {
        return this.getNode(nodeId);
    }

    getAllNodes() {
        return this.getNodes();
    }

    updateNode(nodeId, newData) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        
        if (newData.name !== undefined) node.data.name = newData.name;
        if (newData.data !== undefined) node.data = { ...node.data, ...newData.data };
        if (newData.input !== undefined) node.input = { ...node.input, ...newData.input };
        if (newData.output !== undefined) node.output = { ...node.output, ...newData.output };
        if (newData.x !== undefined) node.x = newData.x;
        if (newData.y !== undefined) node.y = newData.y;
        if (newData.htmlContent !== undefined) node.setHtmlContent(newData.htmlContent);
        if (newData.showHeader !== undefined) node.showHeader = newData.showHeader;

        this.onNodeMoved(node); 
        return true;
    }

    toJSON() {
        return JSON.stringify({
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values())
        });
    }

    fromJSON(json) {
        let obj = json;
        if (typeof json === 'string') {
            obj = JSON.parse(json);
        }
        this.nodes.clear();
        this.connections.clear();
        if (Array.isArray(obj.nodes)) {
            for (const n of obj.nodes) {
                // Reconstrói o Node (mantendo compatibilidade)
                const node = new Node(n.id, n.x, n.y, n.data, n.input, n.output);
                if (n.theme) node.theme = n.theme;
                this.nodes.set(node.id, node);
            }
        }
        if (Array.isArray(obj.connections)) {
            for (const c of obj.connections) {
                const conn = new Connection(c.id, c.sourceNodeId, c.sourceOutputId, c.targetNodeId, c.targetInputId);
                this.connections.set(conn.id, conn);
            }
        }
    }
}

export default FlowlyCore;