/**
 * Widget de Assistente Virtual RAG - Disruptive Architectures
 * Estilizado em harmonia com o tema Material for MkDocs (Deep Purple & Slate)
 *
 * Recursos:
 * - Design moderno com glassmorphism sutil, gradientes elegantes e suporte nativo a Dark/Light Mode.
 * - Animações fluidas de abertura, envio, digitação (typing bounce) e transições de ícone.
 * - Persistência de conversa via sessionStorage: a conversa permanece ativa ao navegar entre páginas!
 * - Compatível com todas as páginas do site (navegação instantânea do MkDocs, notebooks Jupyter e recarregamentos).
 * - Chips com perguntas rápidas (Quick Prompts) para engajamento imediato.
 * - Suporte a blocos de código com botão de cópia e renderização de Markdown enriquecida.
 * - Resolução inteligente de endpoint da API local ou remota com fallbacks.
 */

(function () {
  // Chave de armazenamento de sessão para manter a conversa entre páginas
  const STORAGE_KEY = "da_rag_chat_state_v2";

  // Configuração de URL da API: prioriza window -> localStorage -> URL padrão
  const DEFAULT_API_URL =
    window.DA_CHAT_API_URL ||
    (typeof localStorage !== "undefined" && localStorage.getItem("DA_CHAT_API_URL")) ||
    "http://127.0.0.1:8000/chat";

  // Estado da aplicação que sobrevive à navegação entre páginas
  let estado = carregarEstadoSalvo();

  function carregarEstadoSalvo() {
    try {
      const salvo = sessionStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const dados = JSON.parse(salvo);
        return {
          aberto: !!dados.aberto,
          mensagens: Array.isArray(dados.mensagens) ? dados.mensagens : [],
          enviando: false,
          interactionId: dados.interactionId || null,
        };
      }
    } catch (e) {
      // Ignora erro de sessionStorage desativado
    }
    return {
      aberto: false,
      mensagens: [],
      enviando: false,
      interactionId: null,
    };
  }

  function salvarEstado() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          aberto: estado.aberto,
          mensagens: estado.mensagens.filter((m) => !m.loading),
          interactionId: estado.interactionId,
        })
      );
    } catch (e) {
      // Ignora erro de cota ou bloqueio
    }
  }

  // Perguntas rápidas sugeridas para os alunos
  const SUGESTOES_RAPIDAS = [
    { label: "O que é RAG na prática?", query: "O que é RAG e como ele é usado na disciplina?" },
    { label: "Como funciona o ESP32 e MQTT?", query: "Como conectar o ESP32 ao broker MQTT nos laboratórios de IoT?" },
    { label: "O que cai no Checkpoint?", query: "Quais são as orientações e conteúdos cobrados nos Checkpoints?" },
    { label: "API do Gemini com Python", query: "Como fazer chamadas à API do Gemini usando Python nos laboratórios de GenAI?" },
  ];

  // Injeção de Estilos CSS Avançados
  function injetarEstilos() {
    if (document.getElementById("da-rag-style")) return;

    const style = document.createElement("style");
    style.id = "da-rag-style";
    style.textContent = `
      :root {
        --da-primary: var(--md-primary-fg-color, #7e56c2);
        --da-primary-dark: var(--md-primary-fg-color--dark, #5e35b1);
        --da-primary-light: var(--md-primary-fg-color--light, #9575cd);
        --da-accent: var(--md-accent-fg-color, #ab47bc);
        --da-bg: var(--md-default-bg-color, #ffffff);
        --da-fg: var(--md-default-fg-color, #2e303e);
        --da-bubble-bot-bg: #f3f4f8;
        --da-bubble-bot-border: rgba(126, 86, 194, 0.08);
        --da-card-border: rgba(126, 86, 194, 0.16);
        --da-input-bg: #f8f9fc;
        --da-input-border: rgba(0, 0, 0, 0.1);
        --da-shadow: 0 16px 40px -10px rgba(74, 20, 140, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08);
        --da-code-bg: #1e1e28;
        --da-code-fg: #f8f8f2;
      }

      /* Suporte a Dark Mode (Slate / escuro) */
      [data-md-color-scheme="slate"],
      [data-md-color-scheme="dark"],
      body[data-md-color-scheme="slate"] {
        --da-bg: #1e202e;
        --da-fg: #e2e4ef;
        --da-bubble-bot-bg: #272a3c;
        --da-bubble-bot-border: rgba(255, 255, 255, 0.08);
        --da-card-border: rgba(255, 255, 255, 0.12);
        --da-input-bg: #171824;
        --da-input-border: rgba(255, 255, 255, 0.12);
        --da-shadow: 0 18px 45px -10px rgba(0, 0, 0, 0.65), 0 6px 20px rgba(0, 0, 0, 0.4);
        --da-code-bg: #13141f;
        --da-code-fg: #f1f2f6;
      }

      /* Botão Flutuante (Launcher / Bubble) */
      #da-rag-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10002;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--da-primary) 0%, #4a148c 100%);
        color: #ffffff;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px -2px rgba(103, 58, 183, 0.42), 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        outline: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      #da-rag-bubble:hover {
        transform: translateY(-3px) scale(1.06);
        box-shadow: 0 12px 30px -2px rgba(103, 58, 183, 0.55), 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      #da-rag-bubble:active {
        transform: translateY(0) scale(0.95);
      }

      #da-rag-bubble:focus-visible,
      #da-rag-close:focus-visible,
      #da-rag-clear:focus-visible,
      #da-rag-send:focus-visible,
      #da-rag-input:focus-visible,
      .da-rag-chip:focus-visible {
        outline: 2px solid var(--da-accent);
        outline-offset: 3px;
      }

      /* Animação suave entre ícone de conversa e fechar */
      #da-rag-bubble .da-icon-wrap {
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #da-rag-bubble svg {
        position: absolute;
        width: 26px;
        height: 26px;
        fill: currentColor;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      }

      #da-rag-bubble .icon-chat {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      #da-rag-bubble .icon-close {
        opacity: 0;
        transform: rotate(-90deg) scale(0.6);
      }

      #da-rag-bubble.is-open .icon-chat {
        opacity: 0;
        transform: rotate(90deg) scale(0.6);
      }

      #da-rag-bubble.is-open .icon-close {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      /* Halo pulsante opcional quando inativo */
      #da-rag-bubble::before {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(126, 86, 194, 0.4) 0%, transparent 70%);
        opacity: 0;
        z-index: -1;
        animation: daPulseGlow 3.5s infinite;
      }

      @keyframes daPulseGlow {
        0%, 100% { transform: scale(1); opacity: 0; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }

      /* Tooltip Convidativo (aparece brevemente na primeira carga) */
      #da-rag-tooltip {
        position: fixed;
        bottom: 96px;
        right: 24px;
        z-index: 10001;
        background: var(--da-bg);
        color: var(--da-fg);
        padding: 9px 14px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--da-card-border);
        font-family: var(--md-text-font, sans-serif);
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      #da-rag-tooltip.show {
        opacity: 1;
        transform: translateY(0);
      }

      #da-rag-tooltip .sparkle {
        font-size: 15px;
      }

      /* Janela Principal do Chatbot */
      #da-rag-widget {
        position: fixed;
        bottom: 96px;
        right: 24px;
        z-index: 10002;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 570px;
        max-height: calc(100vh - 120px);
        background: var(--da-bg);
        color: var(--da-fg);
        border-radius: 20px;
        border: 1px solid var(--da-card-border);
        box-shadow: var(--da-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: var(--md-text-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(16px) scale(0.96);
        transform-origin: bottom right;
        transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                    visibility 0.28s;
      }

      #da-rag-widget.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      /* Cabeçalho do Chat */
      #da-rag-header {
        background: linear-gradient(135deg, var(--da-primary) 0%, #4527a0 100%);
        color: #ffffff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        user-select: none;
        flex-shrink: 0;
      }

      .da-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .da-avatar {
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }

      .da-avatar svg {
        width: 20px;
        height: 20px;
        fill: #ffffff;
      }

      .da-status-dot {
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #00e676;
        border: 2px solid #4527a0;
        box-shadow: 0 0 6px #00e676;
      }

      .da-title-group {
        display: flex;
        flex-direction: column;
      }

      .da-title {
        font-weight: 700;
        font-size: 14.5px;
        letter-spacing: 0.2px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .da-badge {
        font-size: 9.5px;
        text-transform: uppercase;
        font-weight: 800;
        letter-spacing: 0.6px;
        background: rgba(255, 255, 255, 0.22);
        padding: 1px 6px;
        border-radius: 10px;
      }

      .da-subtitle {
        font-size: 11.5px;
        opacity: 0.85;
        font-weight: 400;
      }

      .da-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .da-btn-icon {
        background: none;
        border: none;
        color: #ffffff;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: background-color 0.2s ease, transform 0.15s ease;
      }

      .da-btn-icon:hover {
        background-color: rgba(255, 255, 255, 0.18);
        transform: scale(1.05);
      }

      .da-btn-icon:active {
        transform: scale(0.92);
      }

      .da-btn-icon svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      /* Área de Mensagens */
      #da-rag-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        font-size: 13.5px;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }

      #da-rag-messages::-webkit-scrollbar {
        width: 6px;
      }

      #da-rag-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      #da-rag-messages::-webkit-scrollbar-thumb {
        background: rgba(126, 86, 194, 0.25);
        border-radius: 10px;
      }

      #da-rag-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(126, 86, 194, 0.45);
      }

      /* Balão de Boas-vindas Inicial com Sugestões */
      .da-welcome-card {
        background: var(--da-bubble-bot-bg);
        border: 1px solid var(--da-bubble-bot-border);
        border-radius: 16px;
        padding: 14px;
        margin-bottom: 4px;
        animation: daMsgIn 0.35s ease-out;
      }

      .da-welcome-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 13.5px;
        margin-bottom: 6px;
        color: var(--da-primary);
      }

      .da-welcome-text {
        font-size: 13px;
        opacity: 0.9;
        margin-bottom: 12px;
      }

      .da-quick-chips {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .da-rag-chip {
        background: var(--da-bg);
        border: 1px solid var(--da-card-border);
        color: var(--da-fg);
        font-size: 12px;
        padding: 7px 11px;
        border-radius: 10px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
      }

      .da-rag-chip:hover {
        background: var(--da-primary);
        color: #ffffff;
        border-color: var(--da-primary);
        transform: translateX(3px);
      }

      .da-rag-chip span.arrow {
        margin-left: auto;
        opacity: 0.6;
        font-size: 11px;
      }

      /* Balões de Mensagem */
      .da-rag-msg {
        display: flex;
        flex-direction: column;
        max-width: 88%;
        animation: daMsgIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        word-break: break-word;
      }

      @keyframes daMsgIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .da-rag-msg.user {
        align-self: flex-end;
      }

      .da-rag-msg.bot {
        align-self: flex-start;
      }

      .da-rag-msg .bubble {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 13.5px;
        line-height: 1.5;
        position: relative;
      }

      .da-rag-msg.user .bubble {
        background: linear-gradient(135deg, var(--da-primary) 0%, var(--da-primary-dark) 100%);
        color: #ffffff;
        border-bottom-right-radius: 4px;
        box-shadow: 0 3px 10px rgba(103, 58, 183, 0.25);
      }

      .da-rag-msg.bot .bubble {
        background: var(--da-bubble-bot-bg);
        color: var(--da-fg);
        border: 1px solid var(--da-bubble-bot-border);
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }

      .da-rag-msg .bubble p {
        margin: 0 0 8px 0;
      }

      .da-rag-msg .bubble p:last-child {
        margin-bottom: 0;
      }

      .da-rag-msg .bubble ul,
      .da-rag-msg .bubble ol {
        margin: 6px 0;
        padding-left: 20px;
      }

      .da-rag-msg .bubble li {
        margin-bottom: 4px;
      }

      .da-rag-msg .bubble li:last-child {
        margin-bottom: 0;
      }

      .da-rag-msg .bubble code {
        background: rgba(126, 86, 194, 0.12);
        color: var(--da-primary-dark);
        padding: 2px 6px;
        border-radius: 5px;
        font-family: var(--md-code-font, monospace);
        font-size: 12px;
      }

      [data-md-color-scheme="slate"] .da-rag-msg .bubble code,
      body[data-md-color-scheme="slate"] .da-rag-msg .bubble code {
        background: rgba(255, 255, 255, 0.1);
        color: #ce93d8;
      }

      .da-rag-msg .bubble pre {
        background: var(--da-code-bg);
        color: var(--da-code-fg);
        padding: 10px 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 8px 0;
        font-size: 12px;
        line-height: 1.45;
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .da-rag-msg .bubble pre code {
        background: transparent !important;
        color: inherit !important;
        padding: 0;
        font-size: 12px;
        white-space: pre;
      }

      /* Botão de copiar bloco de código */
      .da-copy-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: #ffffff;
        font-size: 10.5px;
        padding: 3px 7px;
        border-radius: 5px;
        cursor: pointer;
        opacity: 0.8;
        transition: all 0.2s ease;
      }

      .da-copy-btn:hover {
        opacity: 1;
        background: var(--da-primary);
      }

      /* Indicador de Digitação (Typing Dots Animados) */
      .da-typing-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 4px;
      }

      .da-typing-text {
        font-size: 12.5px;
        opacity: 0.8;
        font-style: italic;
      }

      .da-typing-dots {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .da-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--da-primary);
        animation: daDotBounce 1.4s infinite ease-in-out both;
      }

      .da-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .da-typing-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes daDotBounce {
        0%, 80%, 100% {
          transform: scale(0.6);
          opacity: 0.4;
        }
        40% {
          transform: scale(1.15);
          opacity: 1;
        }
      }

      /* Fontes / Citações */
      .da-rag-sources {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed var(--da-bubble-bot-border);
      }

      .da-rag-sources-label {
        font-size: 11px;
        font-weight: 600;
        opacity: 0.75;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .da-rag-sources-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .da-rag-source {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border-radius: 12px;
        background: var(--da-bg);
        border: 1px solid var(--da-card-border);
        color: var(--da-fg);
        text-decoration: none;
        font-size: 11.5px;
        transition: all 0.2s ease;
        max-width: 100%;
      }

      .da-rag-source:hover {
        background: var(--da-primary);
        color: #ffffff;
        border-color: var(--da-primary);
        transform: translateY(-1px);
      }

      .da-rag-source svg {
        width: 12px;
        height: 12px;
        fill: currentColor;
        flex-shrink: 0;
      }

      .da-rag-source-label {
        display: block;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Linha de Entrada de Pergunta */
      #da-rag-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        border-top: 1px solid var(--da-card-border);
        background: var(--da-bg);
        flex-shrink: 0;
      }

      .da-input-container {
        flex: 1;
        display: flex;
        align-items: center;
        background: var(--da-input-bg);
        border: 1px solid var(--da-input-border);
        border-radius: 24px;
        padding: 0 12px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .da-input-container:focus-within {
        border-color: var(--da-primary);
        box-shadow: 0 0 0 3px rgba(126, 86, 194, 0.18);
      }

      #da-rag-input {
        flex: 1;
        border: none;
        padding: 10px 0;
        font-size: 13.5px;
        outline: none;
        background: transparent;
        color: var(--da-fg);
        font-family: inherit;
      }

      #da-rag-input::placeholder {
        color: var(--da-fg);
        opacity: 0.5;
      }

      #da-rag-send {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--da-primary) 0%, var(--da-primary-dark) 100%);
        border: none;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
        flex-shrink: 0;
      }

      #da-rag-send svg {
        width: 17px;
        height: 17px;
        fill: currentColor;
        transform: translateX(1px);
      }

      #da-rag-send:hover:not(:disabled) {
        transform: scale(1.08);
      }

      #da-rag-send:active:not(:disabled) {
        transform: scale(0.92);
      }

      #da-rag-send:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      /* Responsividade para telas menores / celulares */
      @media (max-width: 480px) {
        #da-rag-bubble {
          bottom: 16px;
          right: 16px;
          width: 54px;
          height: 54px;
        }

        #da-rag-tooltip {
          display: none;
        }

        #da-rag-widget {
          bottom: 0;
          right: 0;
          width: 100vw;
          max-width: 100vw;
          height: min(600px, 88vh);
          max-height: 88vh;
          border-radius: 20px 20px 0 0;
          border-bottom: none;
          transform: translateY(100%);
        }

        #da-rag-widget.open {
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Ícones SVG embutidos
  const SVGS = {
    chat: `<svg viewBox="0 0 24 24" class="icon-chat"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.38C8.55 21.51 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/></svg>`,
    sparkleChat: `<svg viewBox="0 0 24 24" class="icon-chat"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 10l-1.5 3.3L11 12l-3.3-1.5L11 9l1.5-3.3L14 9l3.3 1.5L14 12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" class="icon-close"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    robot: `<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5 1.5 1.5 0 0 0 7.5 16 1.5 1.5 0 0 0 9 14.5 1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5M12 17c-2 0-3.5 1-3.5 1h7s-1.5-1-3.5-1"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    doc: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    minimize: `<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>`,
  };

  /** Monta a interface do widget se ela ainda não existir no body */
  function montarWidget() {
    if (!document.body) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", montarWidget, { once: true });
      }
      return;
    }

    injetarEstilos();

    // Se o elemento já existe, apenas sincroniza o estado e sai
    let bubble = document.getElementById("da-rag-bubble");
    let widget = document.getElementById("da-rag-widget");

    if (!bubble) {
      bubble = document.createElement("button");
      bubble.id = "da-rag-bubble";
      bubble.title = "Assistente da disciplina (IA & IoT)";
      bubble.setAttribute("aria-label", "Abrir assistente virtual");
      bubble.setAttribute("aria-expanded", String(estado.aberto));
      bubble.innerHTML = `
        <div class="da-icon-wrap">
          ${SVGS.sparkleChat}
          ${SVGS.close}
        </div>
      `;
      document.body.appendChild(bubble);

      // Tooltip informativo sutil na primeira visita da sessão
      if (!sessionStorage.getItem("da_rag_tooltip_seen")) {
        const tooltip = document.createElement("div");
        tooltip.id = "da-rag-tooltip";
        tooltip.innerHTML = `<span class="sparkle">✦</span> Dúvidas sobre o conteúdo? Fale com a IA!`;
        document.body.appendChild(tooltip);

        setTimeout(() => tooltip.classList.add("show"), 1200);
        setTimeout(() => {
          tooltip.classList.remove("show");
          setTimeout(() => tooltip.remove(), 400);
        }, 7500);

        sessionStorage.setItem("da_rag_tooltip_seen", "1");
      }
    }

    if (!widget) {
      widget = document.createElement("div");
      widget.id = "da-rag-widget";
      widget.setAttribute("role", "dialog");
      widget.setAttribute("aria-labelledby", "da-rag-title");
      widget.innerHTML = `
        <div id="da-rag-header">
          <div class="da-header-left">
            <div class="da-avatar">
              ${SVGS.robot}
              <div class="da-status-dot"></div>
            </div>
            <div class="da-title-group">
              <span id="da-rag-title" class="da-title">
                Assistente IA <span class="da-badge">RAG</span>
              </span>
              <span class="da-subtitle">Disruptive Architectures · IA & IoT</span>
            </div>
          </div>
          <div class="da-header-actions">
            <button id="da-rag-clear" class="da-btn-icon" title="Limpar conversa" aria-label="Limpar histórico da conversa">
              ${SVGS.trash}
            </button>
            <button id="da-rag-close" class="da-btn-icon" title="Minimizar assistente" aria-label="Fechar assistente">
              ${SVGS.minimize}
            </button>
          </div>
        </div>
        <div id="da-rag-messages" aria-live="polite" aria-busy="false"></div>
        <div id="da-rag-input-row">
          <div class="da-input-container">
            <input id="da-rag-input" type="text" placeholder="Pergunte sobre aulas, labs, IoT, GenAI..." aria-label="Sua pergunta" />
          </div>
          <button id="da-rag-send" type="button" aria-label="Enviar pergunta" title="Enviar pergunta">
            ${SVGS.send}
          </button>
        </div>
      `;
      document.body.appendChild(widget);
    }

    const inputEl = widget.querySelector("#da-rag-input");
    const sendButton = widget.querySelector("#da-rag-send");
    const messagesEl = widget.querySelector("#da-rag-messages");
    const closeButton = widget.querySelector("#da-rag-close");
    const clearButton = widget.querySelector("#da-rag-clear");

    // Limpa mensagens renderizadas no container e restaura histórico do estado
    messagesEl.innerHTML = "";

    if (estado.mensagens.length === 0) {
      renderizarBoasVindas(messagesEl);
    } else {
      estado.mensagens.forEach((m) => renderizarMensagem(messagesEl, m));
    }

    // Restaura visual aberto/fechado
    if (estado.aberto) {
      widget.classList.add("open");
      bubble.classList.add("is-open");
      bubble.setAttribute("aria-expanded", "true");
    } else {
      widget.classList.remove("open");
      bubble.classList.remove("is-open");
      bubble.setAttribute("aria-expanded", "false");
    }

    // Configuração dos Event Listeners (removendo anteriores se reexecutado)
    bubble.onclick = alternarWidget;
    closeButton.onclick = fecharWidget;
    clearButton.onclick = limparConversa;
    sendButton.onclick = enviarPergunta;
    inputEl.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarPergunta();
      }
    };
  }

  function alternarWidget() {
    const widget = document.getElementById("da-rag-widget");
    const bubble = document.getElementById("da-rag-bubble");
    if (!widget || !bubble) return;

    estado.aberto = !widget.classList.contains("open");
    if (estado.aberto) {
      widget.classList.add("open");
      bubble.classList.add("is-open");
      bubble.setAttribute("aria-expanded", "true");
      const input = document.getElementById("da-rag-input");
      if (input) setTimeout(() => input.focus(), 150);
    } else {
      widget.classList.remove("open");
      bubble.classList.remove("is-open");
      bubble.setAttribute("aria-expanded", "false");
    }
    salvarEstado();
  }

  function fecharWidget() {
    const widget = document.getElementById("da-rag-widget");
    const bubble = document.getElementById("da-rag-bubble");
    if (widget) widget.classList.remove("open");
    if (bubble) {
      bubble.classList.remove("is-open");
      bubble.setAttribute("aria-expanded", "false");
      bubble.focus();
    }
    estado.aberto = false;
    salvarEstado();
  }

  function limparConversa() {
    if (estado.mensagens.length === 0) return;
    if (!confirm("Deseja reiniciar a conversa com o assistente?")) return;

    estado.mensagens = [];
    estado.interactionId = null;
    salvarEstado();

    const messagesEl = document.getElementById("da-rag-messages");
    if (messagesEl) {
      messagesEl.innerHTML = "";
      renderizarBoasVindas(messagesEl);
    }
  }

  function renderizarBoasVindas(container) {
    const welcome = document.createElement("div");
    welcome.className = "da-welcome-card";
    welcome.innerHTML = `
      <div class="da-welcome-header">
        <span>✨</span> Bem-vindo ao Assistente Virtual!
      </div>
      <div class="da-welcome-text">
        Estou conectado a toda a base de aulas, laboratórios de IoT, GenAI, Python e checkpoints. Como posso ajudar você hoje?
      </div>
      <div class="da-quick-chips">
        ${SUGESTOES_RAPIDAS.map(
          (s) => `
          <button class="da-rag-chip" type="button" data-query="${s.query.replace(/"/g, "&quot;")}">
            <span>💡</span> ${s.label}
            <span class="arrow">➔</span>
          </button>`
        ).join("")}
      </div>
    `;

    // Event listener para cliques nas sugestões rápidas
    welcome.querySelectorAll(".da-rag-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-query");
        if (query) {
          const inputEl = document.getElementById("da-rag-input");
          if (inputEl) inputEl.value = query;
          enviarPergunta();
        }
      });
    });

    container.appendChild(welcome);
    container.scrollTop = container.scrollHeight;
  }

  async function enviarPergunta() {
    const inputEl = document.getElementById("da-rag-input");
    const sendButton = document.getElementById("da-rag-send");
    const messagesEl = document.getElementById("da-rag-messages");
    if (!inputEl || !messagesEl) return;

    const pergunta = inputEl.value.trim();
    if (!pergunta || estado.enviando) return;

    estado.enviando = true;
    inputEl.disabled = true;
    if (sendButton) sendButton.disabled = true;
    messagesEl.setAttribute("aria-busy", "true");
    inputEl.value = "";

    // Adiciona pergunta do usuário
    addMessage(pergunta, "user");

    // Mostra indicador animado de busca
    const loadingId = addMessage("", "bot", null, true);

    try {
      const resp = await fazerRequisicaoChat(pergunta);
      const data = await resp.json();

      removeMessage(loadingId);

      if (data.erro) {
        addMessage("⚠️ " + data.erro, "bot");
      } else {
        estado.interactionId = data.interaction_id || estado.interactionId;
        addMessage(data.resposta, "bot", data.fontes);
      }
    } catch (e) {
      removeMessage(loadingId);
      console.error("[DA Chat Widget] Erro ao comunicar com a API:", e);

      let aviso =
        "Não consegui falar com o assistente no momento. Certifique-se de que a API RAG está ativa.";
      if (location.protocol === "https:" && DEFAULT_API_URL.startsWith("http://")) {
        aviso +=
          " (Atenção: navegadores bloqueiam chamadas HTTP a partir de páginas seguras HTTPS devido a Mixed Content).";
      }
      addMessage(aviso, "bot");
    } finally {
      estado.enviando = false;
      salvarEstado();

      const inputAtual = document.getElementById("da-rag-input");
      const sendAtual = document.getElementById("da-rag-send");
      const msgAtual = document.getElementById("da-rag-messages");

      if (inputAtual) {
        inputAtual.disabled = false;
        inputAtual.focus();
      }
      if (sendAtual) sendAtual.disabled = false;
      if (msgAtual) msgAtual.setAttribute("aria-busy", "false");
    }
  }

  /** Faz a requisição à API, testando fallback inteligente se local */
  async function fazerRequisicaoChat(pergunta) {
    const payload = JSON.stringify({
      mensagem: pergunta,
      previous_interaction_id: estado.interactionId,
    });

    const headers = { "Content-Type": "application/json" };

    // Tenta primeiro o endpoint configurado
    try {
      const resp = await fetch(DEFAULT_API_URL, {
        method: "POST",
        headers,
        body: payload,
      });
      if (resp.ok) return resp;
      throw new Error(`HTTP ${resp.status}`);
    } catch (errPrimario) {
      // Se estamos em localhost e a URL é a porta 8000, tenta fallback para 8001 (caso mkdocs serve ocupe a 8000)
      if (DEFAULT_API_URL.includes(":8000/chat")) {
        const fallbackUrl = DEFAULT_API_URL.replace(":8000/chat", ":8001/chat");
        try {
          const respFallback = await fetch(fallbackUrl, {
            method: "POST",
            headers,
            body: payload,
          });
          if (respFallback.ok) return respFallback;
        } catch (_) {}
      }
      throw errPrimario;
    }
  }

  // --- Renderização de Markdown e Mensagens ---
  let proximoId = 1;

  function markdownParaHtml(texto) {
    if (!texto) return "";

    let seguro = texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Preserva blocos de código com ``` ... ```
    const blocosDeCodigo = [];
    seguro = seguro.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, codigo) => {
      const idx = blocosDeCodigo.length;
      blocosDeCodigo.push({
        lang: lang || "code",
        code: codigo.replace(/\n$/, ""),
      });
      return `%%CODEBLOCK_${idx}%%`;
    });

    // Formatações inline básicas
    seguro = seguro.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    seguro = seguro.replace(/__(.+?)__/g, "<strong>$1</strong>");
    seguro = seguro.replace(/\*(.+?)\*/g, "<em>$1</em>");
    seguro = seguro.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
    seguro = seguro.replace(/`([^`]+)`/g, "<code>$1</code>");
    seguro = seguro.replace(/^#{1,6}\s+(.+)$/gm, "<strong>$1</strong>");

    // Citações no texto tipo [Fonte: URL] convertidas para links legíveis
    seguro = seguro.replace(
      /\[Fonte:\s*(https?:\/\/[^\s\]]+)\]/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="da-inline-source">🔗 Fonte</a>'
    );

    // Listas
    const linhas = seguro.split("\n");
    let html = "";
    let dentroLista = false;

    for (const linha of linhas) {
      const itemLista = linha.match(/^\s*[-*•]\s+(.+)$/);
      const itemNumerado = linha.match(/^\s*(\d+)\.\s+(.+)$/);

      if (itemLista || itemNumerado) {
        if (!dentroLista) {
          html += "<ul>";
          dentroLista = true;
        }
        html += `<li>${itemLista ? itemLista[1] : itemNumerado[2]}</li>`;
      } else {
        if (dentroLista) {
          html += "</ul>";
          dentroLista = false;
        }
        html += linha.trim() ? `<p>${linha}</p>` : "";
      }
    }
    if (dentroLista) html += "</ul>";

    // Reinsere os blocos de código com syntax box e botão de cópia
    html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_, idx) => {
      const item = blocosDeCodigo[Number(idx)];
      const idCode = `da-code-${Date.now()}-${idx}`;
      return `
        <div style="position: relative;">
          <pre id="${idCode}"><code>${item.code}</code></pre>
          <button class="da-copy-btn" type="button" onclick="navigator.clipboard.writeText(document.getElementById('${idCode}').textContent).then(()=>{this.textContent='Copiado!';setTimeout(()=>this.textContent='Copiar',2000);})">Copiar</button>
        </div>
      `;
    });

    return html;
  }

  function renderizarMensagem(container, m) {
    const wrap = document.createElement("div");
    wrap.className = `da-rag-msg ${m.who}`;
    wrap.dataset.msgId = m.id;

    const bubbleEl = document.createElement("div");
    bubbleEl.className = "bubble";

    if (m.loading) {
      bubbleEl.innerHTML = `
        <div class="da-typing-indicator">
          <div class="da-typing-dots">
            <span class="da-typing-dot"></span>
            <span class="da-typing-dot"></span>
            <span class="da-typing-dot"></span>
          </div>
          <span class="da-typing-text">Pesquisando no material...</span>
        </div>
      `;
    } else if (m.who === "bot") {
      bubbleEl.innerHTML = markdownParaHtml(m.texto);
    } else {
      bubbleEl.textContent = m.texto;
    }
    wrap.appendChild(bubbleEl);

    // Renderiza fontes consultadas
    if (m.fontes && m.fontes.length && !m.loading) {
      const srcBox = document.createElement("div");
      srcBox.className = "da-rag-sources";

      const srcLabel = document.createElement("div");
      srcLabel.className = "da-rag-sources-label";
      srcLabel.innerHTML = `${SVGS.doc} <span>Materiais de apoio:</span>`;
      srcBox.appendChild(srcLabel);

      const srcList = document.createElement("div");
      srcList.className = "da-rag-sources-list";

      // Elimina fontes duplicadas por URL
      const urlsVistas = new Set();

      m.fontes.forEach((f) => {
        const url = typeof f === "string" ? f : f.url;
        if (!url || urlsVistas.has(url)) return;
        urlsVistas.add(url);

        const titulo = typeof f === "string" ? "Abrir material" : f.titulo || "Abrir material";
        const link = document.createElement("a");
        link.className = "da-rag-source";
        link.href = url;
        link.target = "_self";
        link.rel = "noopener noreferrer";
        link.title = `${titulo} (${url})`;

        link.innerHTML = `
          ${SVGS.doc}
          <span class="da-rag-source-label">${titulo}</span>
        `;
        srcList.appendChild(link);
      });

      if (urlsVistas.size > 0) {
        srcBox.appendChild(srcList);
        wrap.appendChild(srcBox);
      }
    }

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function addMessage(texto, who, fontes, loading) {
    const id = proximoId++;
    const m = { id, texto, who, fontes, loading: !!loading };
    estado.mensagens.push(m);
    if (!loading) salvarEstado();

    const container = document.getElementById("da-rag-messages");
    if (container) renderizarMensagem(container, m);

    return id;
  }

  function removeMessage(id) {
    estado.mensagens = estado.mensagens.filter((m) => m.id !== id);
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (el) el.remove();
  }

  // --- Inicialização e Garantia em TODAS as páginas ---
  // 1. Monta imediatamente se o DOM já estiver pronto
  if (document.readyState === "complete" || document.readyState === "interactive") {
    montarWidget();
  } else {
    document.addEventListener("DOMContentLoaded", montarWidget);
  }

  // 2. Integração com o Observable do Material for MkDocs (navegação instantânea)
  try {
    if (typeof document$ !== "undefined" && typeof document$.subscribe === "function") {
      document$.subscribe(() => {
        montarWidget();
      });
    } else if (typeof window.document$ !== "undefined" && typeof window.document$.subscribe === "function") {
      window.document$.subscribe(() => {
        montarWidget();
      });
    }
  } catch (e) {
    // segue para observadores auxiliares
  }

  // 3. Suporte a eventos de histórico e páginas de notebooks Jupyter
  window.addEventListener("popstate", montarWidget);
  window.addEventListener("pageshow", montarWidget);

  // 4. MutationObserver no body como rede de segurança final
  if (document.body) {
    new MutationObserver(() => {
      if (!document.getElementById("da-rag-widget")) {
        montarWidget();
      }
    }).observe(document.body, { childList: true, subtree: false });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      new MutationObserver(() => {
        if (!document.getElementById("da-rag-widget")) {
          montarWidget();
        }
      }).observe(document.body, { childList: true, subtree: false });
    });
  }
})();