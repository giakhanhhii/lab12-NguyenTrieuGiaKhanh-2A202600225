/**
 * @param {{
 *  buildResumeTitle: (kind: "quiz"|"slide"|"flash", meta: Record<string, any>) => string,
 *  fullsetResumeItemsFromSpec: (spec: Record<string, string>, openedAt: string) => any[],
 *  hasResumeDockInCurrentSession: (dock: any) => boolean,
 *  pushBot: (text: string, opts?: any) => void,
 *  persistActiveExperience: (resume: any) => void,
 * }} deps
 */
export function createExperienceResumeService(deps) {
  const { buildResumeTitle, fullsetResumeItemsFromSpec, hasResumeDockInCurrentSession, pushBot, persistActiveExperience } = deps;

  /** @type {any} */
  let lastOpenedExperience = null;
  let resumeDockAlreadyPosted = false;

  function generateExperienceId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * @param {Record<string, any>} meta
   */
  function readExperienceIdFromMeta(meta) {
    if (!meta || typeof meta !== "object") return "";
    const byUnderscore = typeof meta.__experienceId === "string" ? meta.__experienceId.trim() : "";
    if (byUnderscore) return byUnderscore;
    const byDirect = typeof meta.experienceId === "string" ? meta.experienceId.trim() : "";
    return byDirect;
  }

  /**
   * @param {Record<string, any>} meta
   * @param {string} experienceId
   */
  function withExperienceIdMeta(meta, experienceId) {
    const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};
    if (!experienceId) return safeMeta;
    return {
      ...safeMeta,
      __experienceId: experienceId,
    };
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {string} [experienceId]
   */
  function rememberOpenExperience(kind, meta, experienceId) {
    lastOpenedExperience = {
      bundleBack: false,
      kind,
      meta: { ...meta },
      experienceId: experienceId || "",
      title: buildResumeTitle(kind, meta),
    };
    resumeDockAlreadyPosted = false;
  }

  /**
   * @param {string} title
   * @param {any[]} items
   */
  function rememberOpenBundleForBack(title, items) {
    lastOpenedExperience = {
      bundleBack: true,
      title: title || "Full set",
      items: items.map((it) => ({
        kind: it.kind,
        meta: { ...(it.meta || {}) },
        experienceId: it.experienceId || "",
        title: it.title,
        openedAt: it.openedAt,
      })),
    };
    resumeDockAlreadyPosted = false;
  }

  /**
   * @param {string} title
   * @param {Record<string, string>} spec
   * @param {string} [experienceId]
   */
  function rememberOpenFullSetMixedForBack(title, spec, experienceId) {
    lastOpenedExperience = {
      fullsetMixedBack: true,
      title: title || "Full set",
      fullsetMixed: { ...spec },
      experienceId: experienceId || "",
    };
    resumeDockAlreadyPosted = false;
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {string} [forcedExperienceId]
   */
  function pushQuickResumeDock(kind, meta, forcedExperienceId = "") {
    const seedMeta = meta && typeof meta === "object" ? meta : {};
    const experienceId = forcedExperienceId || readExperienceIdFromMeta(seedMeta) || generateExperienceId();
    const scopedMeta = withExperienceIdMeta(seedMeta, experienceId);
    const now = new Date().toISOString();
    const resumeDock = {
      kind,
      meta: { ...scopedMeta },
      experienceId,
      title: buildResumeTitle(kind, scopedMeta || {}),
      openedAt: now,
    };
    if (hasResumeDockInCurrentSession(resumeDock)) {
      resumeDockAlreadyPosted = true;
      return;
    }
    pushBot("Đã tạo xong. Bạn có thể bấm Mở để quay lại học liệu này.", { resumeDock });
    resumeDockAlreadyPosted = true;
  }

  function pushResumeDockFromLastOpened() {
    if (!lastOpenedExperience) return;
    if (resumeDockAlreadyPosted) {
      lastOpenedExperience = null;
      resumeDockAlreadyPosted = false;
      persistActiveExperience(lastOpenedExperience);
      return;
    }
    const now = new Date().toISOString();
    if (lastOpenedExperience.bundleBack) {
      const resumeDock = {
        title: lastOpenedExperience.title,
        items: lastOpenedExperience.items,
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience(lastOpenedExperience);
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", { resumeDock });
    } else if (lastOpenedExperience.fullsetMixedBack) {
      const resumeDock = {
        title: lastOpenedExperience.title,
        experienceId: lastOpenedExperience.experienceId || "",
        fullsetMixed: { ...lastOpenedExperience.fullsetMixed },
        items: fullsetResumeItemsFromSpec(lastOpenedExperience.fullsetMixed, now),
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience(lastOpenedExperience);
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", { resumeDock });
    } else {
      const resumeDock = {
        kind: lastOpenedExperience.kind,
        meta: { ...lastOpenedExperience.meta },
        experienceId: lastOpenedExperience.experienceId || "",
        title: lastOpenedExperience.title,
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience(lastOpenedExperience);
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", { resumeDock });
    }
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
    persistActiveExperience(lastOpenedExperience);
  }

  function persistCurrentActiveExperience() {
    persistActiveExperience(lastOpenedExperience);
  }

  /**
   * @param {any} resume
   */
  function setLastOpenedExperience(resume) {
    lastOpenedExperience = resume;
  }

  function getLastOpenedExperience() {
    return lastOpenedExperience;
  }

  function resetResumeState() {
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
  }

  function hasLastOpenedExperience() {
    return Boolean(lastOpenedExperience);
  }

  return {
    generateExperienceId,
    readExperienceIdFromMeta,
    withExperienceIdMeta,
    rememberOpenExperience,
    rememberOpenBundleForBack,
    rememberOpenFullSetMixedForBack,
    pushQuickResumeDock,
    pushResumeDockFromLastOpened,
    persistCurrentActiveExperience,
    setLastOpenedExperience,
    getLastOpenedExperience,
    resetResumeState,
    hasLastOpenedExperience,
  };
}
