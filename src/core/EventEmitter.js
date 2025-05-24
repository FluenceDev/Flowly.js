// src/core/EventEmitter.js

class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(eventName, listener) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);
    }

    off(eventName, listenerToRemove) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = this.listeners[eventName].filter(
            listener => listener !== listenerToRemove
        );
    }

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
