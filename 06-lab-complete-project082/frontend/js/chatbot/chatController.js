import { getChatApiUrl } from "./config.js";
import { getSessionMessages, postChat } from "./chatApi.js";
import {
  ensureSessions,
  saveSessions,
  getCurrentSession,
  getCurrentExperienceState,
  getActiveSessionIndex,
  setActiveSessionIndex,
  findLatestSessionIndexByExperienceKind,
  getSessionsSnapshot,
  createSession,
  renameSession,
  togglePinSession,
  deleteSession,
  setCurrentExperienceState,
  getSessionByIndex,
  setSessionMessages,
  prependSessionMessages,
} from "./sessionStore.js";
import { computeStartFlow } from "./guidedFlow.js";
import { createExperienceLayerView } from "./dom/experienceLayerView.js";
import { mountQuizExperience } from "./dom/quizExperienceView.js";
import { mountFlashExperience } from "./dom/flashExperienceView.js";
import { mountSlideExperience } from "./dom/slideExperienceView.js";
import { mountFullSetHubExperience } from "./dom/fullSetHubExperienceView.js";
import { mountFullSetMixedExperience } from "./dom/fullSetMixedExperienceView.js";
import { createMessageView } from "./dom/messageView.js";
import { createMessageController } from "./controllers/messageController.js";
import { createExperienceController } from "./controllers/experienceController.js";
import { createGuidedInteractionController } from "./controllers/guidedInteractionController.js";
import { createChatSessionListRenderer } from "./controllers/chatSessionListController.js";
import { HISTORY_CHAT_PHASE, ensureHistoryBaseState, ensureExperienceHistoryEntry } from "./services/historyService.js";
import { createFlowService } from "./services/flowService.js";
import { createMessageHistoryService } from "./services/messageHistoryService.js";
import { createExperienceRoutingService } from "./services/experienceRoutingService.js";
import { createStartupHubElement } from "./dom/startupHubCards.js";
import { resolveChatDomElements, setupChatEventManager } from "./dom/chatEventManager.js";
import { openContinueCreateDialog } from "./dom/dialogView.js";

/** @type {any} */
let guided = null;

function setGuidedState(next) {
  guided = next;
}

/** Tránh chồng chéo khi chuyển session quá nhanh. */
let isSwitchingSession = false;

const REMOTE_MESSAGE_PAGE_SIZE = 20;

export function init() {
  console.log("[chatController] init started");
  const domEls = resolveChatDomElements();
  if (!domEls) return;
  const { messages, messagesInner, form, input, sendBtn, threadLabel, chatList, newChatBtn, chatPhase, experienceLayer, experienceBody, backToChatBtn, toggleSidebarBtn, topHomeBtn } = domEls;

  const apiUrl = getChatApiUrl();
  console.log("[chatController] DOM references resolved");

  const layerView = createExperienceLayerView({
    experienceLayer,
    experienceBody,
    chatPhase,
  });
  console.log("[chatController] experience layer view created");

  /** @type {ReturnType<typeof createMessageView>} */
  let msgView;
  /** @type {ReturnType<typeof createMessageController>} */
  let messageController;
  /** @type {ReturnType<typeof createExperienceController>} */
  let experienceController;
  /** @type {ReturnType<typeof createGuidedInteractionController>} */
  let guidedController;
  /** @type {ReturnType<typeof createExperienceRoutingService>} */
  let experienceRoutingService;
  let isSending = false;

  messageController = createMessageController({
    getCurrentSession,
    saveSessions,
    getMessageView: () => msgView,
    postChat,
    apiUrl,
    sendBtn,
    inputEl: input,
  });

  const experienceHooks = { onAiEdit: openChatWithAiDraft, onContinueCreate: continueCreateFromExperience };
  experienceController = createExperienceController({
    getCurrentSession,
    getCurrentExperienceState,
    setCurrentExperienceState,
    saveSessions,
    ensureExperienceHistoryEntry,
    layerView,
    mountQuizExperience,
    mountSlideExperience,
    mountFlashExperience,
    mountFullSetHubExperience,
    mountFullSetMixedExperience,
    experienceHooks,
    pushBot,
  });

  function setStartupUiState(active) {
    const isActive = Boolean(active);
    chatPhase.classList.toggle("startup-mode", isActive);
    messages.classList.toggle("startup-mode", isActive);
  }

  function reattachStartupActionHandlers() {
    msgView.reattachFlowActionHandlers?.();
  }

  function setSendingState(next) {
    isSending = Boolean(next);
    messageController.setSendingState(isSending);
  }

  function pushResumeDockFromLastOpened() {
    experienceController.pushResumeDockFromLastOpened();
  }

  function pushUser(text) {
    if (!messageController) return;
    messageController.pushUser(text);
  }

  function pushQuickResumeDock(kind, meta, experienceId) {
    if (!experienceController) return;
    experienceController.pushQuickResumeDock(kind, meta, experienceId);
  }

  function reenableFlowCard(cardRoot) {
    if (!cardRoot) return;
    cardRoot.querySelectorAll("button").forEach((btn) => {
      /** @type {HTMLButtonElement} */ (btn).disabled = false;
    });
  }

  function pushBot(text, opts) {
    if (!messageController) return;
    messageController.pushBot(text, opts);
  }

  function openChatWithAiDraft(text) {
    layerView.hide();
    input.value = text;
    input.focus();
  }

  async function continueCreateFromExperience(kind, opts) {
    if (!experienceRoutingService) return;
    await experienceRoutingService.continueCreateFromExperience(kind, opts);
  }

  function persistActiveExperience() {
    if (!experienceController) return;
    experienceController.persistActiveExperience();
  }

  async function openSingleExperience(kind, meta, mode, experienceId) {
    if (!experienceController) return;
    await experienceController.openSingleExperience(kind, meta, mode, experienceId);
  }

  guidedController = createGuidedInteractionController({
    getGuided: () => guided,
    setGuided: setGuidedState,
    pushUser,
    pushBot,
    openSingleExperience,
    pushQuickResumeDock,
    reenableFlowCard,
    disableActionButtons: (btnEl) => msgView.disableActionButtons(btnEl),
  });

  async function openResumeExperience(item) {
    if (!experienceController) return;
    await experienceController.openResumeExperience(item);
  }

  async function openResumeOpenAll(items, bundleTitle) {
    if (!experienceController) return;
    await experienceController.openResumeOpenAll(items, bundleTitle);
  }

  async function openResumeFullSetMixed(spec, bundleTitle) {
    if (!experienceController) return;
    await experienceController.openResumeFullSetMixed(spec, bundleTitle);
  }

  async function restoreCurrentSessionExperience() {
    if (!experienceController) return;
    await experienceController.restoreCurrentSessionExperience();
  }

  msgView = createMessageView({
    messagesEl: /** @type {HTMLElement} */ (messages),
    messagesInnerEl: /** @type {HTMLElement} */ (messagesInner),
    onResumeExperience: (item) => void openResumeExperience(item),
    onResumeOpenAll: (items, bundleTitle) => void openResumeOpenAll(items, bundleTitle),
    onResumeOpenFullSetMixed: (spec, bundleTitle) => void openResumeFullSetMixed(spec, bundleTitle),
    onFlowAction: (...args) => guidedController.onFlowAction(...args),
    onFlowCardSubmit: (cardType, payload, cardRoot) => guidedController.handleFlowCardSubmit(cardType, payload, cardRoot),
  });

  console.log("[chatController] controllers initialized");

  /** @type {ReturnType<typeof createMessageHistoryService>} */
  let messageHistoryService;
  /** @type {ReturnType<typeof createFlowService>} */
  let flowService;

  function updateThreadLabel() {
    const current = getCurrentSession();
    threadLabel.textContent = current?.thread_id ? `Thread: ${current.thread_id}` : "";
  }

  function ensureSessionMessagesLoaded(force = false) {
    return messageHistoryService.ensureSessionMessagesLoaded(force);
  }

  function renderMessages() {
    messageHistoryService.renderMessages();
  }

  function renderLoadMoreControl() {
    messageHistoryService.renderLoadMoreControl();
  }

  function scrollToResumeDock() {
    const run = () => {
      const resumeCards = messagesInner.querySelectorAll(".resume-dock-card");
      const lastResumeCard = resumeCards.length ? resumeCards[resumeCards.length - 1] : null;
      if (lastResumeCard && typeof lastResumeCard.scrollIntoView === "function") {
        lastResumeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        messages.scrollTop = messages.scrollHeight;
      }
    };
    requestAnimationFrame(run);
  }

  const renderChatListUI = createChatSessionListRenderer({ chatListEl: /** @type {HTMLElement} */ (chatList), getSessionsSnapshot, getActiveSessionIndex, togglePinSession, renameSession, deleteSession, saveSessions, onSessionSelected: async (idx) => {
    if (isSwitchingSession) return;
    isSwitchingSession = true;
    try {
      persistActiveExperience();
      setActiveSessionIndex(idx);
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      saveSessions();
      try {
        await ensureSessionMessagesLoaded();
      } catch {
        // Keep local cache if remote loading fails.
      }
      renderChatListUI();
      renderMessages();
      await restoreCurrentSessionExperience();
    } finally {
      isSwitchingSession = false;
    }
  }, onSessionDeleted: async () => {
    setGuidedState(null);
    experienceController.resetResumeState();
    persistActiveExperience();
    layerView.hide();
    renderMessages();
  } });

  experienceRoutingService = createExperienceRoutingService({
    experienceController,
    layerView,
    pushBot,
    setGuidedState,
    persistActiveExperience,
    createSession,
    renderChatListUI,
    renderMessages,
    saveSessions,
    focusInput: () => input.focus(),
    historyChatPhase: HISTORY_CHAT_PHASE,
    openContinueCreateDialog,
  });

  messageHistoryService = createMessageHistoryService({
    pageSize: REMOTE_MESSAGE_PAGE_SIZE,
    messagesInner: /** @type {HTMLElement} */ (messagesInner),
    messages: /** @type {HTMLElement} */ (messages),
    threadLabel: /** @type {HTMLElement} */ (threadLabel),
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
    setStartupUiState,
    reattachStartupActionHandlers,
  });

  flowService = createFlowService({
    getSessionsSnapshot,
    findLatestSessionIndexByExperienceKind,
    persistActiveExperience,
    getCurrentSession,
    setCurrentExperienceState,
    createSession,
    setActiveSessionIndex,
    saveSessions,
    renderChatListUI,
    ensureSessionMessagesLoaded: (force) => ensureSessionMessagesLoaded(force),
    renderMessages,
    restoreCurrentSessionExperience,
    computeStartFlow,
    applyEffects: (effects) => guidedController.applyEffects(effects),
    setStartupUiState,
    clearMessages: () => msgView.clear(),
    renderLoadMoreControl,
    updateThreadLabel,
    setGuided: setGuidedState,
    resetResumeState: () => experienceController.resetResumeState(),
    hideLayer: () => layerView.hide(),
  });

  messageHistoryService.setStartupFlowHandler((flowKind) => flowService.startFlowInCurrentSession(flowKind));

  async function sendPrompt(prompt) {
    await messageController.sendPrompt(prompt, {
      onSendingState: setSendingState,
      onThreadUpdated: (threadId) => { threadLabel.textContent = `Thread: ${threadId}`; },
      onError: (errMsg) => { msgView.addMessage("bot", errMsg); },
      onDone: () => { input.focus(); },
    });
  }

  setupChatEventManager({
    form: /** @type {HTMLFormElement} */ (form),
    input: /** @type {HTMLInputElement} */ (input),
    newChatBtn: /** @type {HTMLButtonElement} */ (newChatBtn),
    backToChatBtn: /** @type {HTMLButtonElement | null} */ (backToChatBtn),
    toggleSidebarBtn: /** @type {HTMLButtonElement | null} */ (toggleSidebarBtn),
    topHomeBtn: /** @type {HTMLButtonElement | null} */ (topHomeBtn),
    getIsSending: () => isSending,
    setSendingState,
    getGuided: () => guided,
    onGuidedPrompt: (prompt, guidedState) => guidedController.handleGuidedPrompt(prompt, guidedState, /** @type {HTMLInputElement} */ (input)),
    onSendPrompt: (prompt) => { sendPrompt(prompt); },
    onCreateNewChat: () => {
      persistActiveExperience();
      createSession();
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      renderChatListUI();
      renderMessages();
      saveSessions();
      input.focus();
    },
    hasLastOpenedExperience: () => experienceController.hasLastOpenedExperience(),
    hideLayer: () => layerView.hide(),
    persistActiveExperience,
    pushResumeDockFromLastOpened,
    scrollToResumeDock,
    ensureSessions,
    ensureHistoryBaseState,
    renderChatListUI,
    ensureSessionMessagesLoaded: () => ensureSessionMessagesLoaded(),
    renderMessages,
    handleFlowEntry: (flowKind) => flowService.handleFlowEntry(flowKind),
    restoreCurrentSessionExperience: () => restoreCurrentSessionExperience(),
    onInitBaseRendered: () => { console.log("[chatController] base state rendered"); },
    onInitCompleted: () => { console.log("[chatController] init completed"); },
  });
}
