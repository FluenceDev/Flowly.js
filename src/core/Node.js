class Node {
    constructor(id, x, y, data = {}, input = null, output = null, htmlContent = null, showHeader = true, readOnly = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.data = data;
        this.htmlContent = htmlContent;
        this.showHeader = showHeader;
        this.readOnly = !!readOnly;
        
        this.input = input ? {
            ...input,
            id: input.id || 'input',
            name: input.name || 'Input',
            limit: input.limit === undefined || input.limit === null || Number.isNaN(parseInt(input.limit, 10)) ? Infinity : parseInt(input.limit, 10)
        } : null;

        this.output = output ? {
            ...output,
            id: output.id || 'output',
            name: output.name || 'Output',
            limit: output.limit === undefined || output.limit === null || Number.isNaN(parseInt(output.limit, 10)) ? Infinity : parseInt(output.limit, 10)
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