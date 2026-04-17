import { restoreCurrentSessionExperience as restoreExperienceFromSession } from "../services/experienceService.js";
import { createExperienceHistoryService } from "../services/experienceHistoryService.js";
import { createExperienceResumeService } from "../services/experienceResumeService.js";
import {
  buildResumeTitle,
  computeCompleted,
  fullsetResumeItemsFromSpec,
  normalizeExperienceKind,
  resolveFullsetInitialState,
  resolveSingleInitialState,
} from "../services/experienceStateService.js";
import { resumeDockSignature } from "../utils/serialization.js";

/**
 * @param {{
 *   getCurrentSession: () => any,
 *   getCurrentExperienceState: () => any,
 *   setCurrentExperienceState: (next: any) => void,
 *   saveSessions: () => void,
 *   ensureExperienceHistoryEntry: () => void,
 *   layerView: any,
 *   mountQuizExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountSlideExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountFlashExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountFullSetHubExperience: (layerView: any, opts: any, onOpen: (item: any) => Promise<void>) => Promise<void>,
 *   mountFullSetMixedExperience: (layerView: any, opts: any, hooks: any, mountOpts: any) => Promise<void>,
 *   experienceHooks: any,
 *   pushBot: (text: string, opts?: any) => void,
 * }} deps
 */
export function createExperienceController(deps) {
  const {
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
  } = deps;

  const historyService = createExperienceHistoryService({
    getCurrentExperienceState,
    setCurrentExperienceState,
    saveSessions,
  });

  function hasResumeDockInCurrentSession(targetDock) {
    const targetSignature = resumeDockSignature(targetDock);
    if (!targetSignature) return false;
    const current = getCurrentSession?.();
    const messages = Array.isArray(current?.messages) ? current.messages : [];
    for (let i = 0; i < messages.length; i += 1) {
      const message = messages[i];
      if (!message || typeof message !== "object" || message.role !== "bot" || !message.resumeDock) continue;
      if (resumeDockSignature(message.resumeDock) === targetSignature) return true;
    }
    return false;
  }

  const resumeService = createExperienceResumeService({
    buildResumeTitle,
    fullsetResumeItemsFromSpec,
    hasResumeDockInCurrentSession,
    pushBot,
    persistActiveExperience: (resume) => historyService.persistActiveExperience(resume),
  });

  function readPersistedActiveExperience() {
    return historyService.readPersistedActiveExperience();
  }

  function persistActiveExperience() {
    resumeService.persistCurrentActiveExperience();
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   * @param {string} [forcedExperienceId]
   */
  async function openSingleExperience(kind, meta, mode, forcedExperienceId = "") {
    const seedMeta = meta && typeof meta === "object" ? meta : {};
    const experienceId =
      forcedExperienceId || resumeService.readExperienceIdFromMeta(seedMeta) || resumeService.generateExperienceId();
    const scopedMeta = resumeService.withExperienceIdMeta(seedMeta, experienceId);
    resumeService.rememberOpenExperience(kind, scopedMeta, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    const initialState = resolveSingleInitialState(getCurrentExperienceState() || {}, kind, scopedMeta, mode, experienceId);
    const mountOpts = {
      initialState,
      onStateChange: (state) => {
        const completed = computeCompleted(kind, state);
        historyService.updateSingleExperienceProgress({
          kind,
          meta: scopedMeta,
          experienceId,
          progress: state,
          completed,
          resume: resumeService.getLastOpenedExperience(),
        });
      },
    };
    if (mode === "fresh") {
      historyService.seedSingleExperience({
        kind,
        meta: scopedMeta,
        experienceId,
        resume: resumeService.getLastOpenedExperience(),
      });
    }
    if (kind === "quiz") await mountQuizExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else if (kind === "slide") await mountSlideExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else await mountFlashExperience(layerView, scopedMeta, experienceHooks, mountOpts);
  }

  /**
   * @param {{ kind: string, meta: Record<string, string>, experienceId?: string }} item
   */
  async function openResumeExperience(item) {
    const kind = normalizeExperienceKind(item?.kind || "");
    if (kind !== "quiz" && kind !== "slide" && kind !== "flash") {
      layerView.hide();
      return;
    }
    try {
      const resumeMeta = item && typeof item === "object" && item.meta && typeof item.meta === "object" ? item.meta : {};
      const experienceId =
        (item && typeof item.experienceId === "string" ? item.experienceId : "") ||
        resumeService.readExperienceIdFromMeta(resumeMeta);
      await openSingleExperience(
        /** @type {"quiz"|"slide"|"flash"} */ (kind),
        resumeMeta,
        "resume",
        experienceId,
      );
    } catch {
      layerView.hide();
    }
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   */
  async function openResumeOpenAll(items, bundleTitle) {
    resumeService.rememberOpenBundleForBack(bundleTitle || "Full set", items);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    historyService.seedFullsetHubState({
      bundleTitle: bundleTitle || "Full set",
      resume: resumeService.getLastOpenedExperience(),
    });
    await mountFullSetHubExperience(
      layerView,
      { title: bundleTitle || "Full set", items },
      async (item) => {
        await openResumeExperience(item);
      },
    );
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} bundleTitle
   */
  async function openResumeFullSetMixed(spec, bundleTitle, forcedExperienceId = "") {
    const safeSpec = spec && typeof spec === "object" ? { ...spec } : {};
    const experienceId =
      forcedExperienceId || resumeService.readExperienceIdFromMeta(safeSpec) || resumeService.generateExperienceId();
    const scopedSpec = resumeService.withExperienceIdMeta(safeSpec, experienceId);
    resumeService.rememberOpenFullSetMixedForBack(bundleTitle || "Full set", scopedSpec, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    const initialState = resolveFullsetInitialState(getCurrentExperienceState(), scopedSpec, experienceId);
    await mountFullSetMixedExperience(
      layerView,
      { title: bundleTitle || "Full set", spec: scopedSpec },
      experienceHooks,
      {
        initialState,
        onStateChange: (state) => {
          const completed = computeCompleted("fullset", state);
          historyService.updateFullsetProgress({
            meta: scopedSpec,
            experienceId,
            progress: state,
            completed,
            resume: resumeService.getLastOpenedExperience(),
          });
        },
      },
    );
  }

  async function restoreCurrentSessionExperience() {
    await restoreExperienceFromSession({
      readPersistedActiveExperience,
      setLastOpenedExperience: (resume) => resumeService.setLastOpenedExperience(resume),
      ensureExperienceHistoryEntry,
      hideLayer: () => layerView.hide(),
      openResumeOpenAll,
      openResumeFullSetMixed,
      openResumeExperience,
    });
  }

  function pushQuickResumeDock(kind, meta, forcedExperienceId = "") {
    resumeService.pushQuickResumeDock(kind, meta, forcedExperienceId);
  }

  function pushResumeDockFromLastOpened() {
    resumeService.pushResumeDockFromLastOpened();
  }

  function resetResumeState() {
    resumeService.resetResumeState();
  }

  function hasLastOpenedExperience() {
    return resumeService.hasLastOpenedExperience();
  }

  return {
    persistActiveExperience,
    openSingleExperience,
    openResumeExperience,
    openResumeOpenAll,
    openResumeFullSetMixed,
    restoreCurrentSessionExperience,
    pushQuickResumeDock,
    pushResumeDockFromLastOpened,
    resetResumeState,
    hasLastOpenedExperience,
  };
}
