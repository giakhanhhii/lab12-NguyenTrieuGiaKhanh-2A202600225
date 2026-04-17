/**
 * @param {{
 *   readPersistedActiveExperience: () => any,
 *   setLastOpenedExperience: (resume: any) => void,
 *   ensureExperienceHistoryEntry: () => void,
 *   hideLayer: () => void,
 *   openResumeOpenAll: (items: any[], title: string) => Promise<void>,
 *   openResumeFullSetMixed: (spec: Record<string, string>, title: string) => Promise<void>,
 *   openResumeExperience: (item: { kind: string, meta: Record<string, string>, experienceId?: string }) => Promise<void>,
 * }} deps
 */
export async function restoreCurrentSessionExperience(deps) {
  const restored = deps.readPersistedActiveExperience();
  if (!restored) {
    deps.hideLayer();
    return;
  }
  deps.setLastOpenedExperience(restored);
  deps.ensureExperienceHistoryEntry();
  if (restored.bundleBack && Array.isArray(restored.items)) {
    await deps.openResumeOpenAll(restored.items, restored.title || "Full set");
    return;
  }
  if (restored.fullsetMixedBack && restored.fullsetMixed) {
    await deps.openResumeFullSetMixed(restored.fullsetMixed, restored.title || "Full set");
    return;
  }
  if (restored.kind) {
    await deps.openResumeExperience({ kind: restored.kind, meta: restored.meta || {} });
  }
}
