/**
 * Lightweight event emitter used by Flowly.
 */
class EventEmitter {
    constructor() {
        /** @type {Record<string, Array<(...args: any[]) => void>>} */
        this.listeners = {};
    }

    /**
     * Registers a listener for an event name.
     * @param {string} eventName
     * @param {(...args: any[]) => void} listener
     * @returns {void}
     */
    on(eventName, listener) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);
    }

    /**
     * Removes a specific listener for an event name.
     * @param {string} eventName
     * @param {(...args: any[]) => void} listenerToRemove
     * @returns {void}
     */
    off(eventName, listenerToRemove) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = this.listeners[eventName].filter(
            listener => listener !== listenerToRemove
        );
    }

    /**
     * Emits an event to all registered listeners.
     * @param {string} eventName
     * @param {...any} args
     * @returns {void}
     */
    emit(eventName, ...args) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach(listener => {
            try {
                listener(...args);
            } catch (e) {
                console.error(`Error in event listener for ${eventName}:`, e);
            }
        });
    }
}

export default EventEmitter;
