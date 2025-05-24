class Node {
    constructor(id, x, y, data = {}, input = null, output = null, htmlContent = null, showHeader = true) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.data = data;
        this.htmlContent = htmlContent;
        this.showHeader = showHeader;
        
        this.input = input ? {
            id: input.id || 'input',
            name: input.name || 'Input',
            limit: input.limit === undefined || input.limit === null ? Infinity : parseInt(input.limit, 10),
            ...input
        } : null;

        this.output = output ? {
            id: output.id || 'output',
            name: output.name || 'Output',
            limit: output.limit === undefined || output.limit === null ? Infinity : parseInt(output.limit, 10),
            ...output
        } : null;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setHtmlContent(newHtmlContent) {
        this.htmlContent = newHtmlContent;
    }
}

export default Node;