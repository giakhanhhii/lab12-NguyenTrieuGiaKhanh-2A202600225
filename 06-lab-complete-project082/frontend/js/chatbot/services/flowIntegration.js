/**
 * @param {string} value
 */
export function splitFlowActionValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return { action: "", meta: {} };
  const [actionPart, metaPart = ""] = raw.split("|", 2);
  const action = String(actionPart || "").trim().toLowerCase();
  const meta = {};
  if (metaPart) {
    const params = new URLSearchParams(metaPart);
    params.forEach((v, k) => {
      const key = String(k || "").trim();
      if (!key) return;
      meta[key] = String(v || "").trim();
    });
  }
  return { action, meta };
}

/**
 * @param {any} state
 */
export function hasGuidedKind(state) {
  const kind = String(state?.kind || "");
  return kind === "fullset" || kind === "slide" || kind === "quiz" || kind === "flash";
}

/**
 * @param {string} value
 */
export function normalizeFlowActionValue(value) {
  return splitFlowActionValue(value).action;
}

/**
 * @param {Record<string, any>} rawMeta
 */
function sanitizeFlowActionMeta(rawMeta) {
  const safeMeta = {};
  Object.entries(rawMeta).forEach(([rawKey, rawValue]) => {
    const key = String(rawKey || "").trim();
    if (!key) return;
    const value = String(rawValue ?? "").trim();
    if (!value) return;
    safeMeta[key] = value;
  });
  return safeMeta;
}

/**
 * @param {string} value
 * @param {any} prevGuided
 */
export function buildGuidedFromActionValue(value, prevGuided) {
  void prevGuided;
  const { action, meta } = splitFlowActionValue(value);
  if (!action) return null;
  let kind = "";
  if (action.startsWith("fullset_")) kind = "fullset";
  else if (action.startsWith("slide_")) kind = "slide";
  else if (action.startsWith("quiz_")) kind = "quiz";
  else if (action.startsWith("flash_")) kind = "flash";
  if (!kind) return null;
  const safeMeta = sanitizeFlowActionMeta(meta);
  return { kind, step: "await_source", data: safeMeta };
}

/**
 * @param {{
 *   getGuided: () => any,
 *   setGuided: (next: any) => void,
 *   computePickAction: (guided: any, value: string, opts?: { pdfFile?: File | null }) => { handled: boolean, guided: any, effects: any[] },
 *   getRestartAwaitSourceEffects: (kind: "fullset"|"slide"|"quiz"|"flash") => any[],
 *   pdfSourceActionValues: Set<string>,
 *   pickPdfWithDialog: () => Promise<File | null>,
 *   setPendingPdfFile: (file: File) => void,
 *   pushBot: (text: string, opts?: any) => void,
 *   applyEffects: (effects: any[]) => Promise<void>,
 *   disableActionButtons: (btnEl: HTMLButtonElement) => void,
 * }} deps
 */
export function createFlowActionHandler(deps) {
  const {
    getGuided,
    setGuided,
    computePickAction,
    getRestartAwaitSourceEffects,
    pdfSourceActionValues,
    pickPdfWithDialog,
    setPendingPdfFile,
    pushBot,
    applyEffects,
    disableActionButtons,
  } = deps;

  /**
   * @param {string} value
   * @param {HTMLButtonElement} btnEl
   */
  async function handlePdfSourceAction(value, btnEl) {
    const guided = getGuided();
    btnEl.disabled = true;
    const file = await pickPdfWithDialog();
    btnEl.disabled = false;
    if (!file) {
      const again = getRestartAwaitSourceEffects(guided.kind);
      if (again.length) await applyEffects(again);
      return;
    }
    if (value === "fullset_pdf") setPendingPdfFile(file);
    const result = computePickAction(guided, value, {
      pdfFile: value === "slide_pdf" || value === "quiz_pdf" || value === "flash_pdf" ? file : undefined,
    });
    if (!result.handled) return;
    disableActionButtons(btnEl);
    setGuided(result.guided);
    await applyEffects(result.effects);
  }

  /**
   * @param {string} rawValue
   * @param {HTMLButtonElement} btnEl
   */
  return function onFlowAction(rawValue, btnEl) {
    const value = normalizeFlowActionValue(rawValue);
    if (!value) return;

    let guided = getGuided();
    if (!hasGuidedKind(guided)) {
      const recovered = buildGuidedFromActionValue(rawValue, guided);
      if (!hasGuidedKind(recovered)) {
        pushBot("Không thể khôi phục trạng thái phiên hiện tại. Bạn bắt đầu lại giúp mình nhé.");
        return;
      }
      guided = recovered;
      setGuided(guided);
    }

    if (guided?.step === "await_source" && pdfSourceActionValues.has(value)) {
      void handlePdfSourceAction(value, btnEl);
      return;
    }

    const result = computePickAction(guided, value);
    if (!result.handled) return;
    disableActionButtons(btnEl);
    setGuided(result.guided);
    void applyEffects(result.effects);
  };
}
