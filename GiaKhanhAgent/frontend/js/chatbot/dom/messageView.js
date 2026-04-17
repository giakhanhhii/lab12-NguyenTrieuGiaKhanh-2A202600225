import { BOT_AVATAR_SVG } from "../assets.js";
import { createFlowCard } from "./flowCards.js";
import { createResumeDockCard } from "./resumeDockCard.js";

/** Form slide / quiz / flash (+ meta PDF): giãn ngang gần full cột chat, không áp dụng full set. */
function isWideFlowFormCardType(cardType) {
  return (
    cardType === "slide_form" ||
    cardType === "quiz_form" ||
    cardType === "flash_form" ||
    cardType === "slide_pdf_meta" ||
    cardType === "quiz_pdf_meta" ||
    cardType === "flash_pdf_meta"
  );
}

/**
 * @param {{
 *   messagesEl: HTMLElement,
 *   messagesInnerEl: HTMLElement,
 *   onFlowAction: (value: string, btnEl: HTMLButtonElement) => void,
 *   onFlowCardSubmit?: (cardType: string, payload: Record<string, string>, cardRoot: HTMLElement) => void,
 *   onResumeExperience?: (item: { kind: string, meta: Record<string, string> }) => void,
 *   onResumeOpenAll?: (items: { kind: string, meta: Record<string, string>, title?: string }[], bundleTitle: string) => void,
 *   onResumeOpenFullSetMixed?: (spec: Record<string, string>, bundleTitle: string) => void,
 * }} opts
 */
export function createMessageView(opts) {
  const {
    messagesEl,
    messagesInnerEl,
    onFlowAction,
    onFlowCardSubmit,
    onResumeExperience,
    onResumeOpenAll,
    onResumeOpenFullSetMixed,
  } = opts;

  function handleFlowActionButtonClick() {
    const flowValue = String(this.dataset.flowValue || "");
    if (!flowValue) return;
    onFlowAction(flowValue, this);
  }

  /**
   * @param {{ label: string, value: string }} action
   */
  function createFlowActionButton(action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "msg-action-btn";
    b.textContent = action.label;
    b.dataset.flowValue = action.value;
    b.onclick = handleFlowActionButtonClick;
    return b;
  }

  function reattachFlowActionHandlers() {
    messagesInnerEl.querySelectorAll(".msg-action-btn").forEach((node) => {
      const btn = /** @type {HTMLButtonElement} */ (node);
      const flowValue = String(btn.dataset.flowValue || "");
      if (!flowValue) return;
      if (btn.onclick !== handleFlowActionButtonClick) {
        btn.onclick = handleFlowActionButtonClick;
      }
    });
  }

  /**
   * @param {HTMLElement} contentNode
   * @param {string} [extraRowClass]
   */
  function appendBotRow(contentNode, extraRowClass) {
    const row = document.createElement("div");
    row.className = `msg-row bot${extraRowClass ? ` ${extraRowClass}` : ""}`;
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    row.appendChild(avatar);
    row.appendChild(contentNode);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  /**
   * @param {"user"|"bot"} role
   * @param {string} text
   * @param {any} third legacy: actions array, or `{ actions?, cardType? }`
   */
  function addMessage(role, text, third) {
    /** @type {{ label: string, value: string }[]} */
    let actions = [];
    /** @type {string | null} */
    let cardType = null;
    if (Array.isArray(third)) actions = third;
    else if (third && typeof third === "object") {
      if (Array.isArray(third.actions)) actions = third.actions;
      if (typeof third.cardType === "string") cardType = third.cardType;
    }

    /** @type {any} */
    let resumeDock = null;
    if (third && typeof third === "object" && third.resumeDock) resumeDock = third.resumeDock;
    const showResume = !!(resumeDock && onResumeExperience);

    if (role === "user") {
      const row = document.createElement("div");
      row.className = "msg-row user";
      const bubble = document.createElement("div");
      bubble.className = "bubble user";
      bubble.textContent = text;
      row.appendChild(bubble);
      messagesInnerEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    const hasCard = !!(cardType && onFlowCardSubmit);
    const hasActions = actions.length > 0;
    const hasText = text.trim().length > 0;
    const headerParts = hasText || hasActions;

    if (hasCard && headerParts) {
      const bubble = document.createElement("div");
      bubble.className = "bubble bot";
      if (hasText) {
        const t = document.createElement("div");
        t.style.whiteSpace = "pre-wrap";
        t.textContent = text;
        bubble.appendChild(t);
      }
      if (hasActions) {
        const ar = document.createElement("div");
        ar.className = "msg-actions";
        actions.forEach((a) => {
          ar.appendChild(createFlowActionButton(a));
        });
        bubble.appendChild(ar);
      }
      if (showResume) {
        bubble.classList.add("bubble-has-resume-dock");
        bubble.appendChild(
          createResumeDockCard(
            resumeDock,
            (item) => onResumeExperience(item),
            onResumeOpenAll,
            onResumeOpenFullSetMixed,
          ),
        );
      }
      appendBotRow(bubble);

      const shell = document.createElement("div");
      shell.className = "msg-flow-card-shell";
      if (isWideFlowFormCardType(cardType)) shell.classList.add("msg-flow-card-shell-wide");
      const cardRoot = createFlowCard(cardType, {
        onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
      });
      shell.appendChild(cardRoot);
      appendBotRow(shell, "msg-row-flow-card");

      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    if (hasCard && !headerParts) {
      const shell = document.createElement("div");
      shell.className = "msg-flow-card-shell";
      if (isWideFlowFormCardType(cardType)) shell.classList.add("msg-flow-card-shell-wide");
      const cardRoot = createFlowCard(cardType, {
        onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
      });
      shell.appendChild(cardRoot);
      appendBotRow(shell);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return shell;
    }

    const row = document.createElement("div");
    row.className = "msg-row bot";
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    const bubble = document.createElement("div");
    bubble.className = "bubble bot";

    if (hasActions || cardType || showResume) {
      if (hasText) {
        const t = document.createElement("div");
        t.style.whiteSpace = "pre-wrap";
        t.textContent = text;
        bubble.appendChild(t);
      }
      if (hasActions) {
        const ar = document.createElement("div");
        ar.className = "msg-actions";
        actions.forEach((a) => {
          ar.appendChild(createFlowActionButton(a));
        });
        bubble.appendChild(ar);
      }
      if (cardType && onFlowCardSubmit) {
        bubble.classList.add("bubble-has-flow-card");
        if (isWideFlowFormCardType(cardType)) bubble.classList.add("bubble-has-flow-card-wide");
        const cardRoot = createFlowCard(cardType, {
          onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
        });
        bubble.appendChild(cardRoot);
      }
      if (showResume) {
        bubble.classList.add("bubble-has-resume-dock");
        bubble.appendChild(
          createResumeDockCard(
            resumeDock,
            (item) => onResumeExperience(item),
            onResumeOpenAll,
            onResumeOpenFullSetMixed,
          ),
        );
      }
    } else {
      bubble.textContent = text;
    }
    if (hasActions && !hasCard) {
      bubble.classList.add("startup");
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function disableActionButtons(btnEl) {
    const row = btnEl.closest(".msg-row");
    if (!row) return;
    row.querySelectorAll(".msg-action-btn").forEach((b) => {
      b.disabled = true;
      b.style.opacity = "0.65";
      b.style.cursor = "default";
    });
  }

  function addThinkingBubble() {
    const row = document.createElement("div");
    row.className = "msg-row bot";
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    const bubble = document.createElement("div");
    bubble.className = "bubble bot thinking-bubble";
    bubble.innerHTML = `
          <div class="thinking" aria-label="Teachly đang suy nghĩ">
            <span></span><span></span><span></span>
          </div>
        `;
    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return { row, bubble };
  }

  async function streamBotReply(text) {
    const bubble = addMessage("bot", "");
    let i = 0;
    const speed = 8;
    while (i <= text.length) {
      bubble.textContent = text.slice(0, i);
      i += Math.max(1, Math.floor(text.length / 120));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      await new Promise((r) => setTimeout(r, speed));
    }
    bubble.textContent = text;
  }

  function clear() {
    messagesInnerEl.innerHTML = "";
  }

  /**
   * @param {HTMLElement} hubRoot
   */
  function appendStartupHub(hubRoot) {
    const row = document.createElement("div");
    row.className = "msg-row msg-row-startup-hub";
    row.appendChild(hubRoot);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  return {
    addMessage,
    disableActionButtons,
    addThinkingBubble,
    streamBotReply,
    clear,
    appendStartupHub,
    reattachFlowActionHandlers,
  };
}
