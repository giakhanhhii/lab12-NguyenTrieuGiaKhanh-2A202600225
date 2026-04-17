/**
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 */
export function buildResumeTitle(kind, meta) {
  if (kind === "quiz") return `Trắc nghiệm — ${meta.topic || "Bộ đề"}`;
  if (kind === "slide") return `Slide — ${meta.topic || "Bài giảng"}`;
  if (kind === "flash") return `Flashcard — ${meta.source || "Bộ thẻ"}`;
  return "Học liệu";
}

/**
 * @param {Record<string, string>} a
 * @param {Record<string, string>} b
 */
export function sameMeta(a, b) {
  const ak = Object.keys(a || {}).sort();
  const bk = Object.keys(b || {}).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i += 1) {
    const key = ak[i];
    if (key !== bk[i]) return false;
    if (String(a[key] || "") !== String(b[key] || "")) return false;
  }
  return true;
}

/**
 * @param {any} state
 */
function readHistoryById(state) {
  return state && typeof state === "object" && state.historyById && typeof state.historyById === "object"
    ? state.historyById
    : null;
}

/**
 * @param {"quiz"|"slide"|"flash"|"fullset"} kind
 * @param {any} progress
 */
export function computeCompleted(kind, progress) {
  const total = Number(progress?.total || 0);
  const index = Number(progress?.index || 0);
  if (!Number.isFinite(total) || total <= 0) return false;
  if (!Number.isFinite(index) || index < total - 1) return false;
  if (kind === "quiz") {
    const graded = Array.isArray(progress?.gradedByIndex) ? progress.gradedByIndex : [];
    return Boolean(graded[total - 1]);
  }
  if (kind === "fullset") {
    return Boolean(progress?.completed) || index >= total - 1;
  }
  return true;
}

/**
 * @param {any} currentExperienceState
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 * @param {"fresh"|"resume"} mode
 */
export function resolveSingleInitialState(currentExperienceState, kind, meta, mode, experienceId = "") {
  const history = readHistoryById(currentExperienceState);
  const historyEntry = experienceId && history ? history[experienceId] : null;
  if (historyEntry && historyEntry.kind === kind && historyEntry.progress) {
    return historyEntry.progress;
  }
  const persisted =
    mode === "resume" && currentExperienceState?.kind === kind
      ? currentExperienceState.progress
      : null;
  return persisted && persisted.meta && sameMeta(persisted.meta, meta || {}) ? persisted : null;
}

/**
 * @param {any} currentExperienceState
 * @param {Record<string, string>} spec
 */
export function resolveFullsetInitialState(currentExperienceState, spec, experienceId = "") {
  const history = readHistoryById(currentExperienceState);
  const historyEntry = experienceId && history ? history[experienceId] : null;
  if (historyEntry && historyEntry.kind === "fullset" && historyEntry.progress) {
    return historyEntry.progress;
  }
  const persisted = currentExperienceState?.kind === "fullset" ? currentExperienceState.progress : null;
  return persisted && persisted.spec && sameMeta(persisted.spec, spec || {}) ? persisted : null;
}

/**
 * @param {string} rawKind
 */
export function normalizeExperienceKind(rawKind) {
  const normalized = String(rawKind || "").toLowerCase();
  if (normalized === "flashcard" || normalized === "flash") return "flash";
  if (normalized.startsWith("quiz")) return "quiz";
  if (normalized.startsWith("slide")) return "slide";
  return normalized;
}

/**
 * @param {Record<string, string>} spec
 * @param {string} openedAtIso
 */
export function fullsetResumeItemsFromSpec(spec, openedAtIso) {
  const topic = spec.topic || "—";
  const t = openedAtIso || new Date().toISOString();
  const baseExperienceId = typeof spec?.__experienceId === "string" ? spec.__experienceId : "";
  const slideExperienceId = baseExperienceId ? `${baseExperienceId}:slide` : "";
  const quizExperienceId = baseExperienceId ? `${baseExperienceId}:quiz` : "";
  const flashExperienceId = baseExperienceId ? `${baseExperienceId}:flash` : "";
  return [
    {
      kind: "slide",
      meta: {
        topic,
        count: String(spec.slides || "—"),
        notes: "Full set (demo mock)",
        ...(slideExperienceId ? { __experienceId: slideExperienceId } : {}),
      },
      ...(slideExperienceId ? { experienceId: slideExperienceId } : {}),
      title: `Slide — ${topic}`,
      openedAt: t,
    },
    {
      kind: "quiz",
      meta: {
        topic,
        count: String(spec.quiz || "—"),
        notes: "Full set (demo mock)",
        ...(quizExperienceId ? { __experienceId: quizExperienceId } : {}),
      },
      ...(quizExperienceId ? { experienceId: quizExperienceId } : {}),
      title: `Trắc nghiệm — ${topic}`,
      openedAt: t,
    },
    {
      kind: "flash",
      meta: {
        source: topic,
        count: String(spec.flash || "—"),
        extra: "Full set (demo mock)",
        ...(flashExperienceId ? { __experienceId: flashExperienceId } : {}),
      },
      ...(flashExperienceId ? { experienceId: flashExperienceId } : {}),
      title: `Flashcard — ${topic}`,
      openedAt: t,
    },
  ];
}
