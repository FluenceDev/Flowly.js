// src/main.js
import FlowlyCore from './core/Flowly';
import FlowlyVanillaUI from './ui/vanilla';

class Flowly {
    constructor(containerId) {
        this.core = new FlowlyCore();
        this.ui = new FlowlyVanillaUI(containerId, this.core);
        this.ui.renderInitial();
    }

    addNode(x, y, data) {
        return this.core.addNode(x, y, data);
    }

    removeNode(nodeId) {
        return this.core.removeNode(nodeId);
    }
}

export default Flowly;