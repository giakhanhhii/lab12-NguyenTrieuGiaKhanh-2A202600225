const CARD_TYPE_BY_KIND = {
  fullset: "fullset_topic",
  quiz: "quiz_form",
  slide: "slide_form",
  flash: "flash_form",
};

const INTRO_TEXT_BY_KIND = {
  fullset: "Tuyệt vời! Điền nhanh thông tin để Teachly tạo Full Set mới:",
  quiz: "Tuyệt vời! Thiết lập thông số cho bộ câu hỏi mới tại đây:",
  slide: "Tuyệt vời! Điền thông tin để Teachly thiết kế bộ slide mới:",
  flash: "Tuyệt vời! Cung cấp thông tin để Teachly tạo bộ Flashcard mới:",
};

/**
 * @param {{
 *  experienceController: { resetResumeState: () => void, persistActiveExperience: () => void },
 *  layerView: { hide: () => void },
 *  pushBot: (text: string, opts?: any) => void,
 *  setGuidedState: (next: any) => void,
 *  persistActiveExperience: () => void,
 *  createSession: () => void,
 *  renderChatListUI: () => void,
 *  renderMessages: () => void,
 *  saveSessions: () => void,
 *  focusInput: () => void,
 *  historyChatPhase: string,
 *  openContinueCreateDialog: (kind: "fullset"|"quiz"|"slide"|"flash") => Promise<"same"|"other"|null>,
 * }} deps
 */
export function createExperienceRoutingService(deps) {
  const {
    experienceController,
    layerView,
    pushBot,
    setGuidedState,
    persistActiveExperience,
    createSession,
    renderChatListUI,
    renderMessages,
    saveSessions,
    focusInput,
    historyChatPhase,
    openContinueCreateDialog,
  } = deps;

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"} kind
   * @param {{ preset?: "same"|"other" }} [opts]
   */
  async function continueCreateFromExperience(kind, opts) {
    const validKind =
      kind === "fullset" || kind === "quiz" || kind === "slide" || kind === "flash" ? kind : null;
    if (!validKind) return;

    const preset = opts && typeof opts === "object" ? opts.preset : undefined;
    const selected =
      preset === "same" || preset === "other" ? preset : await openContinueCreateDialog(validKind);
    if (!selected) return;

    const state = history.state && typeof history.state === "object" ? history.state : {};
    history.replaceState({ ...state, phase: historyChatPhase }, "", location.href);
    layerView.hide();

    if (selected === "same") {
      experienceController.resetResumeState();
      experienceController.persistActiveExperience();
      setGuidedState({ kind: validKind, step: "await_topic_form", data: {} });
      pushBot(INTRO_TEXT_BY_KIND[validKind], { cardType: CARD_TYPE_BY_KIND[validKind] });
    } else {
      persistActiveExperience();
      createSession();
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      renderChatListUI();
      renderMessages();
      saveSessions();
    }

    focusInput();
  }

  return {
    continueCreateFromExperience,
  };
}
