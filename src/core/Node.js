class Node {
    constructor(id, x, y, data = {}) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.data = data;
        this.inputs = [];
        this.outputs = [];
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

export default Node;