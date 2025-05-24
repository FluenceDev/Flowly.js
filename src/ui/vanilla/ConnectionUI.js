// src/ui/vanilla/Connection.js
class ConnectionUI {
    constructor(connection, svgContainer, getPortWorldPositionFunction, getSimpleBezierPathFunction) {
        this.connection = connection;
        this.svgContainer = svgContainer;
        // Funções passadas do FlowlyVanillaUI para calcular posições e path
        this.getPortWorldPosition = getPortWorldPositionFunction;
        this.getSimpleBezierPath = getSimpleBezierPathFunction;

        this.lineElement = this.createLineElement();
        this.render();
    }

    createLineElement() {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, 'path');
        path.classList.add('flowly-connection'); // Adiciona a classe CSS
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#555'); // Cor padrão da linha
        path.setAttribute('stroke-width', '2'); // Largura padrão da linha
        // Define como a linha responde a eventos de ponteiro: 'stroke' significa que só a borda da linha é clicável
        // 'auto' faria toda a caixa delimitadora da linha ser clicável, o que pode ser menos preciso.
        path.style.pointerEvents = 'stroke';
        // Adiciona um data attribute para identificar a conexão no DOM, útil para seleção
        path.setAttribute('data-connection-id', this.connection.id);
        return path;
    }

    render() {
        this.svgContainer.appendChild(this.lineElement);
        // Chama updateLinePosition para desenhar a linha na posição inicial
        this.updateLinePosition(); // ESTA É A LINHA 28 QUE ESTAVA DANDO ERRO
    }

    // Método para atualizar a posição da linha da conexão
    updateLinePosition() {
        // Obter as posições das portas. getPortWorldPosition já lida com o zoom e offset
        const sourcePos = this.getPortWorldPosition(
            this.connection.sourceNodeId,
            this.connection.sourceOutputId,
            'output'
        );
        const targetPos = this.getPortWorldPosition(
            this.connection.targetNodeId,
            this.connection.targetInputId,
            'input'
        );

        // Somente desenha a linha se ambas as posições forem válidas e contiverem números
        if (sourcePos && targetPos &&
            typeof sourcePos.x === 'number' && !isNaN(sourcePos.x) &&
            typeof sourcePos.y === 'number' && !isNaN(sourcePos.y) &&
            typeof targetPos.x === 'number' && !isNaN(targetPos.x) &&
            typeof targetPos.y === 'number' && !isNaN(targetPos.y)) {

            // Agora, getSimpleBezierPath precisa do zoom.
            // A forma como está, getSimpleBezierPath é uma função pura passada do FlowlyVanillaUI,
            // e ela usa `this.zoom` do contexto do FlowlyVanillaUI. Isso está correto.
            const pathData = this.getSimpleBezierPath(sourcePos, targetPos);
            this.lineElement.setAttribute('d', pathData);
        } else {
            // Se as posições são inválidas, esconde a linha para evitar erros de renderização NaN
            this.lineElement.setAttribute('d', 'M 0 0'); // Desenha um ponto para evitar o erro NaN no console
            console.warn(`Flowly: Could not draw connection for ID ${this.connection.id}. Source or target position invalid.`);
        }
    }

    // Método para remover o elemento da linha do DOM
    remove() {
        if (this.lineElement.parentNode) {
            this.lineElement.parentNode.removeChild(this.lineElement);
        }
    }
}

export default ConnectionUI;