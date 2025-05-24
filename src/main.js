// src/main.js
import FlowlyCore from './core/Flowly';
import FlowlyVanillaUI from './ui/vanilla';

class Flowly {
    constructor(containerId, options = {}) {
        this.core = new FlowlyCore();
        this.ui = new FlowlyVanillaUI(containerId, this.core, options);
        this.ui.renderInitial();
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

    addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId) {
        return this.core.addConnection(sourceNodeId, sourceOutputId, targetNodeId, targetInputId);
    }

    removeConnection(connectionId) {
        return this.core.removeConnection(connectionId);
    }

    toJSON() {
        return this.core.toJSON();
    }

    fromJSON(json) {
        return this.core.fromJSON(json);
    }
}

export default Flowly;