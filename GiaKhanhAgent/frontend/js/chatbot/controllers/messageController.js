/**
 * @param {{
 *   getCurrentSession: () => any,
 *   saveSessions: () => void,
 *   getMessageView: () => any,
 *   postChat: (apiUrl: string, prompt: string, threadId?: string) => Promise<any>,
 *   apiUrl: string,
 *   sendBtn: HTMLButtonElement,
 *   inputEl: HTMLInputElement | HTMLTextAreaElement,
 * }} deps
 */
export function createMessageController(deps) {
  const { getCurrentSession, saveSessions, getMessageView, postChat, apiUrl, sendBtn, inputEl } = deps;

  /**
   * @param {boolean} next
   */
  function setSendingState(next) {
    const isSending = Boolean(next);
    sendBtn.disabled = isSending;
    inputEl.disabled = isSending;
    if (isSending) {
      sendBtn.dataset.pendingText = sendBtn.textContent || "";
      sendBtn.textContent = "Sending...";
    } else if (sendBtn.dataset.pendingText) {
      sendBtn.textContent = sendBtn.dataset.pendingText;
      delete sendBtn.dataset.pendingText;
    }
  }

  /**
   * @param {string} text
   */
  function pushUser(text) {
    const current = getCurrentSession();
    getMessageView().addMessage("user", text);
    current.messages.push({ role: "user", text });
    saveSessions();
  }

  /**
   * @param {string} text
   * @param {any} opts
   */
  function pushBot(text, opts) {
    const current = getCurrentSession();
    /** @type {{ label: string, value: string }[]} */
    let actions = [];
    /** @type {string | undefined} */
    let cardType;
    /** @type {any} */
    let resumeDock;
    if (Array.isArray(opts)) actions = opts;
    else if (opts && typeof opts === "object") {
      if (Array.isArray(opts.actions)) actions = opts.actions;
      if (typeof opts.cardType === "string") cardType = opts.cardType;
      if (opts.resumeDock) resumeDock = opts.resumeDock;
    }
    getMessageView().addMessage("bot", text, { actions, cardType, resumeDock });
    const entry = { role: "bot", text };
    if (actions.length) entry.actions = actions;
    if (cardType) entry.cardType = cardType;
    if (resumeDock) entry.resumeDock = resumeDock;
    current.messages.push(entry);
    saveSessions();
  }

  /**
   * @param {string} prompt
   * @param {{
   *   onSendingState: (next: boolean) => void,
   *   onThreadUpdated: (threadId: string) => void,
   *   onError: (message: string) => void,
   *   onDone: () => void,
   * }} hooks
   */
  async function sendPrompt(prompt, hooks) {
    hooks.onSendingState(true);
    try {
      const current = getCurrentSession();
      const msgView = getMessageView();
      msgView.addMessage("user", prompt);
      if (!Array.isArray(current.messages)) current.messages = [];
      current.messages.push({ role: "user", text: prompt });
      current.messagesLoaded = true;
      current.remoteOffset = Math.max(0, Math.floor(Number(current.remoteOffset || 0))) + 1;
      saveSessions();
      inputEl.value = "";
      const thinking = msgView.addThinkingBubble();
      try {
        const data = await postChat(apiUrl, prompt, current.thread_id);
        current.thread_id = data.thread_id;
        hooks.onThreadUpdated(current.thread_id);
        thinking.row.remove();
        await msgView.streamBotReply(data.reply);
        current.messages.push({ role: "bot", text: data.reply });
        current.messagesLoaded = true;
        current.remoteOffset = Math.max(0, Math.floor(Number(current.remoteOffset || 0))) + 1;
        saveSessions();
      } catch (err) {
        thinking.row.remove();
        hooks.onError(`Lỗi: ${err.message}`);
      }
    } finally {
      hooks.onSendingState(false);
      hooks.onDone();
    }
  }

  return { setSendingState, pushUser, pushBot, sendPrompt };
}
