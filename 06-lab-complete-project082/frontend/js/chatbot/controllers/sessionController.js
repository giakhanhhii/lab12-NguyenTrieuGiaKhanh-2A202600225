/**
 * @param {{
 *   chatListEl: HTMLElement,
 *   renderChatList: (
 *     el: HTMLElement,
 *     sessions: any[],
 *     activeIndex: number,
 *     onPick: (idx: number) => void,
 *     onAction: (action: string, idx: number) => void,
 *   ) => void,
 *   getSessionsSnapshot: () => any[],
 *   getActiveSessionIndex: () => number,
 *   togglePinSession: (idx: number) => boolean,
 *   renameSession: (idx: number, title: string) => boolean,
 *   deleteSession: (idx: number) => boolean,
 *   saveSessions: () => void,
 *   onSessionSelected: (idx: number) => void | Promise<void>,
 *   onSessionDeleted: () => void | Promise<void>,
 * }} deps
 */
let rerenderQueued = false;
let scheduledRerenderFn = null;

function scheduleRerender() {
  if (rerenderQueued || typeof scheduledRerenderFn !== "function") return;
  rerenderQueued = true;
  const run = () => {
    rerenderQueued = false;
    scheduledRerenderFn();
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(run);
    return;
  }
  window.setTimeout(run, 0);
}

export function renderSessionListUI(deps) {
  const {
    chatListEl,
    renderChatList,
    getSessionsSnapshot,
    getActiveSessionIndex,
    togglePinSession,
    renameSession,
    deleteSession,
    saveSessions,
    onSessionSelected,
    onSessionDeleted,
  } = deps;

  let actionInFlight = false;
  scheduledRerenderFn = () => {
    renderSessionListUI(deps);
  };

  renderChatList(
    chatListEl,
    getSessionsSnapshot(),
    getActiveSessionIndex(),
    (idx) => {
      if (actionInFlight) return;
      actionInFlight = true;
      void Promise.resolve(onSessionSelected(idx)).finally(() => {
        actionInFlight = false;
      });
    },
    (action, idx) => {
      if (actionInFlight) return;
      if (action === "pin") {
        actionInFlight = true;
        if (togglePinSession(idx)) {
          saveSessions();
          scheduleRerender();
        }
        actionInFlight = false;
        return;
      }
      if (action === "rename") {
        actionInFlight = true;
        const currentSession = getSessionsSnapshot()[idx];
        const raw = window.prompt("Nhập tên mới cho đoạn chat", currentSession?.title || "");
        const nextTitle = typeof raw === "string" ? raw.trim() : "";
        if (nextTitle && renameSession(idx, nextTitle)) {
          saveSessions();
          scheduleRerender();
        }
        actionInFlight = false;
        return;
      }
      if (action === "delete") {
        actionInFlight = true;
        void (async () => {
          try {
            const ok = window.confirm("Bạn có chắc muốn xóa đoạn chat này?");
            if (!ok) return;
            if (!deleteSession(idx)) return;
            await Promise.resolve(onSessionDeleted());
            saveSessions();
            scheduleRerender();
          } catch (err) {
            console.error("Delete session action failed:", err);
          } finally {
            actionInFlight = false;
          }
        })();
        return;
      }
      if (action === "share") {
        actionInFlight = true;
        const s = getSessionsSnapshot()[idx];
        const transcript = (s?.messages || [])
          .map((m) => `${m.role === "user" ? "Bạn" : "Teachly"}: ${m.text || ""}`)
          .join("\n");
        const payload = `${s?.title || "Đoạn chat"}\n\n${transcript}`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(payload).then(
            () => window.alert("Đã sao chép nội dung cuộc trò chuyện."),
            () => window.alert("Không thể sao chép tự động. Vui lòng thử lại."),
          );
        } else {
          window.alert("Trình duyệt không hỗ trợ clipboard.");
        }
        actionInFlight = false;
      }
    },
  );
}

/**
 * @param {{
 *   newChatBtn: HTMLButtonElement,
 *   onCreateNewChat: () => void | Promise<void>,
 * }} deps
 */
export function bindNewChatButton(deps) {
  const { newChatBtn, onCreateNewChat } = deps;
  let creating = false;
  newChatBtn.addEventListener("click", () => {
    if (creating) return;
    creating = true;
    newChatBtn.disabled = true;
    void Promise.resolve(onCreateNewChat()).finally(() => {
      creating = false;
      newChatBtn.disabled = false;
    });
  });
}
