import { resumeDockSignature } from "../utils/serialization.js";

/**
 * @param {{
 *   role: string,
 *   text?: string,
 *   content?: string,
 * }} message
 */
function normalizeRemoteMessage(message) {
  const role = message?.role === "assistant" || message?.role === "bot" ? "bot" : "user";
  const text = String(message?.text ?? message?.content ?? "");
  return { role, text };
}

/**
 * Avoid replacing local rich messages (actions/cards/resume dock) with
 * plain DB history because that would break interactive card behavior.
 * @param {any[]} messages
 */
function hasInteractiveMessages(messages) {
  if (!Array.isArray(messages)) return false;
  return messages.some(
    (m) =>
      m &&
      typeof m === "object" &&
      (Boolean(m.cardType) || Boolean(m.resumeDock) || (Array.isArray(m.actions) && m.actions.length > 0)),
  );
}

/**
 * @param {{
 *   pageSize: number,
 *   messagesInner: HTMLElement,
 *   messages: HTMLElement,
 *   threadLabel: HTMLElement,
 *   msgView: { clear: () => void, addMessage: (role: "user"|"bot", text: string, third?: any) => any, appendStartupHub: (hub: HTMLElement) => void },
 *   getCurrentSession: () => any,
 *   getActiveSessionIndex: () => number,
 *   getSessionByIndex: (idx: number) => any,
 *   setSessionMessages: (idx: number, messages: any[], opts?: { hasMoreRemote?: boolean, remoteOffset?: number }) => boolean,
 *   prependSessionMessages: (idx: number, messages: any[], opts?: { hasMoreRemote?: boolean, remoteOffset?: number }) => boolean,
 *   saveSessions: () => void,
 *   ensureSessions: () => void,
 *   getSessionMessages: (threadId: string, opts: { limit: number, offset: number }) => Promise<any>,
 *   createStartupHubElement: (onFlowSelected: (flowKind: "fullset"|"quiz"|"slide"|"flashcard") => void) => HTMLElement,
 *   onStartupFlowSelected?: (flowKind: "fullset"|"quiz"|"slide"|"flashcard") => Promise<void> | void,
 *   setStartupUiState: (active: boolean) => void,
 *   reattachStartupActionHandlers: () => void,
 * }} deps
 */
export function createMessageHistoryService(deps) {
  const {
    pageSize,
    messagesInner,
    messages,
    threadLabel,
    msgView,
    getCurrentSession,
    getActiveSessionIndex,
    getSessionByIndex,
    setSessionMessages,
    prependSessionMessages,
    saveSessions,
    ensureSessions,
    getSessionMessages,
    createStartupHubElement,
    onStartupFlowSelected: initialStartupFlowHandler,
    setStartupUiState,
    reattachStartupActionHandlers,
  } = deps;

  let isLoadingMore = false;
  let onStartupFlowSelected = initialStartupFlowHandler;
  /** @type {HTMLButtonElement | null} */
  let loadMoreBtn = null;

  function initializeCurrentSessionState() {
    ensureSessions();
    const current = getCurrentSession();
    if (!current || typeof current !== "object") return { current: null, changed: false };
    let changed = false;
    if (!Array.isArray(current.messages)) {
      current.messages = [];
      changed = true;
    }
    return { current, changed };
  }

  /**
   * @param {(flowKind: "fullset"|"quiz"|"slide"|"flashcard") => Promise<void> | void} handler
   */
  function setStartupFlowHandler(handler) {
    onStartupFlowSelected = handler;
  }

  function removeLoadMoreButton() {
    if (loadMoreBtn?.parentElement) loadMoreBtn.parentElement.remove();
    loadMoreBtn = null;
  }

  function renderLoadMoreControl() {
    removeLoadMoreButton();
    const current = getCurrentSession();
    if (!current?.thread_id || !current.hasMoreRemote) return;
    const row = document.createElement("div");
    row.className = "msg-row";
    row.style.justifyContent = "center";
    row.style.marginBottom = "8px";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "msg-action-btn";
    btn.textContent = isLoadingMore ? "Loading..." : "Load more";
    btn.disabled = isLoadingMore;
    btn.addEventListener("click", () => {
      void loadMoreHistory();
    });
    row.appendChild(btn);
    messagesInner.prepend(row);
    loadMoreBtn = btn;
  }

  async function ensureSessionMessagesLoaded(force = false) {
    const init = initializeCurrentSessionState();
    if (init.changed) saveSessions();
    const idx = getActiveSessionIndex();
    const session = getSessionByIndex(idx);
    if (!session) return;
    if (!session.thread_id) {
      session.messagesLoaded = true;
      session.hasMoreRemote = false;
      session.remoteOffset = Array.isArray(session.messages) ? session.messages.length : 0;
      return;
    }
    if (!force && hasInteractiveMessages(session.messages)) {
      session.messagesLoaded = true;
      return;
    }
    if (session.messagesLoaded && !force) return;
    const data = await getSessionMessages(session.thread_id, { limit: pageSize, offset: 0 });
    const mapped = Array.isArray(data.messages) ? data.messages.map(normalizeRemoteMessage) : [];
    const total = Number(data.total || 0);
    setSessionMessages(idx, mapped, {
      hasMoreRemote: Boolean(data.has_more),
      remoteOffset: mapped.length || Math.min(pageSize, total),
    });
    saveSessions();
  }

  async function loadMoreHistory() {
    const idx = getActiveSessionIndex();
    const session = getSessionByIndex(idx);
    if (!session?.thread_id || !session.hasMoreRemote || isLoadingMore) return;
    isLoadingMore = true;
    renderLoadMoreControl();
    try {
      const data = await getSessionMessages(session.thread_id, {
        limit: pageSize,
        offset: Number(session.remoteOffset || 0),
      });
      const mapped = Array.isArray(data.messages) ? data.messages.map(normalizeRemoteMessage) : [];
      prependSessionMessages(idx, mapped, {
        hasMoreRemote: Boolean(data.has_more),
        remoteOffset: Number(session.remoteOffset || 0) + mapped.length,
      });
      saveSessions();
      renderMessages();
    } catch {
      // Keep existing messages; just restore button state.
      renderLoadMoreControl();
    } finally {
      isLoadingMore = false;
      renderLoadMoreControl();
    }
  }

  function renderMessages() {
    msgView.clear();
    ensureSessions();
    const current = getCurrentSession();
    if (!current) {
      setStartupUiState(false);
      return;
    }
    const messagesToRender = Array.isArray(current.messages) ? current.messages : [];
    if (!messagesToRender.length) {
      setStartupUiState(true);
      const startupHub = createStartupHubElement((flowKind) => {
        if (typeof onStartupFlowSelected === "function") {
          void onStartupFlowSelected(flowKind);
        }
      });
      msgView.appendStartupHub(startupHub);
      requestAnimationFrame(() => {
        messages.scrollTop = 0;
      });
    } else {
      setStartupUiState(false);
      const seenResumeDocks = new Set();
      messagesToRender.forEach((m) => {
        if (m?.role === "bot" && m?.resumeDock) {
          const signature = resumeDockSignature(m.resumeDock);
          if (signature && seenResumeDocks.has(signature)) {
            return;
          }
          if (signature) seenResumeDocks.add(signature);
        }
        if (m.role === "bot" && (m.cardType || (m.actions && m.actions.length) || m.resumeDock)) {
          msgView.addMessage("bot", m.text || "", {
            actions: m.actions || [],
            cardType: m.cardType,
            resumeDock: m.resumeDock,
          });
        } else {
          msgView.addMessage(m.role, m.text, m.actions);
        }
      });
    }
    renderLoadMoreControl();
    reattachStartupActionHandlers();
    threadLabel.textContent = current.thread_id ? `Thread: ${current.thread_id}` : "";
  }

  return {
    ensureSessionMessagesLoaded,
    loadMoreHistory,
    renderLoadMoreControl,
    renderMessages,
    setStartupFlowHandler,
  };
}
