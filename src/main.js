// src/main.js
import FlowlyCore from './core/Flowly';
import FlowlyVanillaUI from './ui/vanilla';

class Flowly {
    constructor(containerId, options = {}) {
        this.core = new FlowlyCore();
        this.ui = new FlowlyVanillaUI(containerId, this.core, options);
        this.core.setGlobalReadOnly(options.readOnly || false);
        this.ui.renderInitial();
    }

    setReadOnly(isReadOnly) {
        const readOnlyState = !!isReadOnly;
        this.core.setGlobalReadOnly(readOnlyState);
        if (this.ui && typeof this.ui.setReadOnly === 'function') {
            this.ui.setReadOnly(readOnlyState);
        }
        return this;
    }

    on(eventName, listener) {
        if (this.core && this.core.eventEmitter) {
            this.core.eventEmitter.on(eventName, listener);
        } else {
            console.warn("Attempted to register event listener before core is initialized.");
        }
        return this;
    }

    off(eventName, listener) {
        if (this.core && this.core.eventEmitter) {
            this.core.eventEmitter.off(eventName, listener);
        } else {
            console.warn("Attempted to unregister event listener before core is initialized.");
        }
        return this;
    }

    setTheme(themeObj) {
        // Aplica as variáveis CSS no :root
        for (const key in themeObj) {
            document.documentElement.style.setProperty(key, themeObj[key]);
        }
    }

    setBackground(options) {
        if (this.ui && typeof this.ui.setBackground === 'function') {
            this.ui.setBackground(options);
        } else {
            console.warn("UI não suporta setBackground ou não está inicializada.");
        }
    }

    addNode(config) {
        return this.core.addNode(config);
    }

    removeNode(nodeId) {
        return this.core.removeNode(nodeId);
    }

    getById(nodeId) {
        return this.core.getById(nodeId);
    }

    getAllNodes() {
        return this.core.getAllNodes();
    }

    getConnections(nodeId) {
        return this.core.getConnections(nodeId);
    }

    getConnectedNodes(nodeId) {
        return this.core.getConnectedNodes(nodeId);
    }

    getAllConnections() {
        return this.core.getAllConnections();
    }

    updateNode(nodeId, newData) {
        const result = this.core.updateNode(nodeId, newData);

        if (result && 
            (newData.htmlContent !== undefined || 
             newData.showHeader !== undefined || 
             newData.name !== undefined || 
             newData.data !== undefined)
        ) {
            const node = this.core.getNode(nodeId);
            if (node) {
                this.ui.removeNodeUI(nodeId);
                this.ui.addNodeUI(node);
            }
        }
        return result;
    }

    addConnection(...args) {
        let sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent = null;

        if (args.length === 2 || (args.length === 3 && typeof args[2] === 'string')) {
            // Assinatura: (sourceNodeId, targetNodeId, optionalLabelHtmlContent)
            sourceNodeId = args[0];
            targetNodeId = args[1];
            if (args.length === 3) {
                labelHtmlContent = args[2];
            }

            const sourceNode = this.core.getNode(sourceNodeId); // getNode do core retorna o nó com suas props
            const targetNode = this.core.getNode(targetNodeId);

            if (!sourceNode) {
                console.warn(`addConnection: Source node with id "${sourceNodeId}" not found.`);
                return null;
            }
            if (!targetNode) {
                console.warn(`addConnection: Target node with id "${targetNodeId}" not found.`);
                return null;
            }

            if (!sourceNode.output || !sourceNode.output.id) {
                console.warn(`addConnection: Source node "${sourceNodeId}" does not have a default output port defined or it lacks an id.`);
                return null;
            }
            if (!targetNode.input || !targetNode.input.id) {
                console.warn(`addConnection: Target node "${targetNodeId}" does not have a default input port defined or it lacks an id.`);
                return null;
            }

            sourceOutputId = `${sourceNodeId}-${sourceNode.output.id}`;
            targetInputId = `${targetNodeId}-${targetNode.input.id}`;

        } else if (args.length === 4 || args.length === 5) {
            // Assinatura: (sourceNodeId, sourceOutputId, targetNodeId, targetInputId, optionalLabelHtmlContent)
            sourceNodeId = args[0];
            sourceOutputId = args[1];
            targetNodeId = args[2];
            targetInputId = args[3];
            if (args.length === 5) {
                labelHtmlContent = args[4];
            }
        } else {
            console.error('addConnection: Invalid number of arguments.');
            return null;
        }

        return this.core.addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId, labelHtmlContent);
    }

    removeConnection(connectionId) {
        return this.core.removeConnection(connectionId);
    }

    addLabelToConnection(connectionId, labelHtmlContent) {
        return this.core.updateConnectionLabel(connectionId, labelHtmlContent);
    }

    toJSON() {
        return this.core.toJSON();
    }

    fromJSON(json) {
        this.core.fromJSON(json);
    }
}

export default Flowly;