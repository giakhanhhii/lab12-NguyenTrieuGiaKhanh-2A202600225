export const HISTORY_CHAT_PHASE = "chat";
export const HISTORY_EXPERIENCE_PHASE = "experience";

export function ensureHistoryBaseState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  if (state.phase === HISTORY_CHAT_PHASE || state.phase === HISTORY_EXPERIENCE_PHASE) return;
  history.replaceState({ ...state, phase: HISTORY_CHAT_PHASE }, "", location.href);
}

export function ensureExperienceHistoryEntry() {
  ensureHistoryBaseState();
  const state = history.state && typeof history.state === "object" ? history.state : {};
  if (state.phase === HISTORY_EXPERIENCE_PHASE) return;
  history.pushState({ ...state, phase: HISTORY_EXPERIENCE_PHASE }, "", location.href);
}

export function inExperienceHistoryState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  return state.phase === HISTORY_EXPERIENCE_PHASE;
}

/**
 * @param {{
 *   hasLastOpenedExperience: () => boolean,
 *   hideLayer: () => void,
 *   persistActiveExperience: () => void,
 *   pushResumeDockFromLastOpened: () => void,
 *   onReturnedToChat?: () => void,
 * }} deps
 */
export function createPopStateHandler(deps) {
  const {
    hasLastOpenedExperience,
    hideLayer,
    persistActiveExperience,
    pushResumeDockFromLastOpened,
    onReturnedToChat,
  } = deps;
  return function onPopState() {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    if (state.phase === HISTORY_EXPERIENCE_PHASE) return;
    if (!hasLastOpenedExperience()) {
      hideLayer();
      persistActiveExperience();
      onReturnedToChat?.();
      return;
    }
    hideLayer();
    pushResumeDockFromLastOpened();
    onReturnedToChat?.();
  };
}
