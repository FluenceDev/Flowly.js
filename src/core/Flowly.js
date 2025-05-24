// src/core/Flowly.js
import Node from './Node';
import Connection from './Connection';
import EventEmitter from './EventEmitter'; 

class FlowlyCore {
    constructor() {
        this.nodes = new Map();
        this.connections = new Map();
        this.nextNodeId = 1;
        this.nextConnectionId = 1;
        this.eventEmitter = new EventEmitter();

        this.onNodeAdded = () => {}; 
        this.onNodeRemoved = () => {};
        this.onNodeUpdated = () => {};
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
        
        if (this.onNodeAdded) this.onNodeAdded(newNode);
        
        const nodeWithConnections = this.getNode(nodeId);
        this.eventEmitter.emit('nodeCreated', nodeWithConnections);
        return newNode; 
    }

    removeNode(nodeId) {
        const nodeInstance = this.nodes.get(nodeId); 
        if (nodeInstance) {
            const nodeDataForEvent = this.getNode(nodeId);
            
            this.nodes.delete(nodeId);
            const connectionsToRemove = [];
            this.connections.forEach((conn) => {
                if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
                    connectionsToRemove.push(conn);
                }
            });
            connectionsToRemove.forEach(conn => {
                this.removeConnection(conn.id); 
            });
            
            if (this.onNodeRemoved) this.onNodeRemoved(nodeId);
            this.eventEmitter.emit('nodeRemoved', nodeDataForEvent);
            return true;
        }
        return false;
    }

    updateNodePosition(nodeId, newX, newY) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.setPosition(newX, newY);
            this.onNodeUpdated(node);
            return true;
        }
        return false;
    }

    addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent = null) {
        const sourceNodeInstance = this.nodes.get(sourceNodeId);
        const targetNodeInstance = this.nodes.get(targetNodeId);

        if (!sourceNodeInstance || !targetNodeInstance) {
            console.warn('Source or target node not found for connection.');
            return null;
        }

        // Verificar se as portas específicas existem (pode ser mais robusto)
        const sourcePort = sourceNodeInstance.output;
        const targetPort = targetNodeInstance.input;

        if (!sourcePort || sourcePort.id !== sourceOutputId.split('-').pop()) {
            console.warn(`Source port ${sourceOutputId} not found or ID mismatch on node ${sourceNodeId}.`);
            return null;
        }
        if (!targetPort || targetPort.id !== targetInputId.split('-').pop()) {
            console.warn(`Target port ${targetInputId} not found or ID mismatch on node ${targetNodeId}.`);
            return null;
        }

        // Verificação de Limite da Porta de Saída
        if (sourcePort.limit !== Infinity) {
            let outputConnectionsCount = 0;
            for (const conn of this.connections.values()) {
                if (conn.sourceNodeId === sourceNodeId && conn.sourceOutputId === sourceOutputId) {
                    outputConnectionsCount++;
                }
            }
            if (outputConnectionsCount >= sourcePort.limit) {
                console.warn(`Output port ${sourceOutputId} on node ${sourceNodeId} has reached its connection limit of ${sourcePort.limit}.`);
                this.eventEmitter.emit('connectionLimitReached', { nodeId: sourceNodeId, portId: sourceOutputId, portType: 'output', limit: sourcePort.limit });
                return null;
            }
        }

        // Verificação de Limite da Porta de Entrada
        if (targetPort.limit !== Infinity) {
            let inputConnectionsCount = 0;
            for (const conn of this.connections.values()) {
                if (conn.targetNodeId === targetNodeId && conn.targetInputId === targetInputId) {
                    inputConnectionsCount++;
                }
            }
            if (inputConnectionsCount >= targetPort.limit) {
                console.warn(`Input port ${targetInputId} on node ${targetNodeId} has reached its connection limit of ${targetPort.limit}.`);
                this.eventEmitter.emit('connectionLimitReached', { nodeId: targetNodeId, portId: targetInputId, portType: 'input', limit: targetPort.limit });
                return null;
            }
        }

        const hasDuplicate = Array.from(this.connections.values()).some(conn => 
            conn.sourceNodeId === sourceNodeId && conn.sourceOutputId === sourceOutputId &&
            conn.targetNodeId === targetNodeId && conn.targetInputId === targetInputId
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
        const newConnection = new Connection(id, sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent);
        this.connections.set(id, newConnection);
        
        if (this.onConnectionAdded) this.onConnectionAdded(newConnection);
        
        const sourceNodeForEvent = this.getNode(sourceNodeId);
        const targetNodeForEvent = this.getNode(targetNodeId);
        this.eventEmitter.emit('connectionCreated', { connection: newConnection, sourceNode: sourceNodeForEvent, targetNode: targetNodeForEvent });
        return newConnection;
    }

    removeConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            const connectionToRemove = this.connections.get(connectionId);
            const sourceNode = this.getNode(connectionToRemove.sourceNodeId);
            const targetNode = this.getNode(connectionToRemove.targetNodeId);
            
            this.connections.delete(connectionId);

            if (this.onConnectionRemoved) this.onConnectionRemoved(connectionToRemove);
            this.eventEmitter.emit('connectionRemoved', { connection: connectionToRemove, sourceNode, targetNode });
            return true;
        }
        return false;
    }

    getConnections(nodeId) {
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

            const nodeConnections = this.getConnections(nodeId);
            return {
                ...node,
                connections: nodeConnections
            };
        }
        return undefined;
    }

    getNodes() {
        const allNodes = Array.from(this.nodes.values());
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

        if (this.onNodeUpdated) this.onNodeUpdated(node);
        
        const updatedNode = this.getNode(nodeId);
        this.eventEmitter.emit('nodeUpdated', updatedNode);
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

    updateConnectionLabel(connectionId, labelHtmlContent) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.labelHtmlContent = labelHtmlContent;
            // Dispara um evento para notificar a UI sobre a mudança no label
            const sourceNode = this.getNode(connection.sourceNodeId);
            const targetNode = this.getNode(connection.targetNodeId);
            this.eventEmitter.emit('connectionLabelChanged', { connection, sourceNode, targetNode });
            return true;
        }
        console.warn(`updateConnectionLabel: Connection with id "${connectionId}" not found.`);
        return false;
    }
}

export default FlowlyCore;