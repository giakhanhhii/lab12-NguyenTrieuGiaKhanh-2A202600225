/**
 * @param {"fullset"|"quiz"|"slide"|"flash"} kind
 * @returns {Promise<"same"|"other"|null>}
 */
export function openContinueCreateDialog(kind) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "continue-create-overlay";
    const dialog = document.createElement("div");
    dialog.className = "continue-create-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const kindLabel =
      kind === "fullset" ? "full set" : kind === "quiz" ? "quiz" : kind === "slide" ? "slide" : "flashcard";
    const title = document.createElement("h3");
    title.className = "continue-create-title";
    title.textContent = `Bạn có chắc chắn muốn tiếp tục tạo ${kindLabel}?`;

    const actions = document.createElement("div");
    actions.className = "continue-create-actions";
    const otherBtn = document.createElement("button");
    otherBtn.type = "button";
    otherBtn.className = "continue-create-btn continue-create-btn-secondary";
    otherBtn.textContent = "Tạo thẻ khác";
    const sameBtn = document.createElement("button");
    sameBtn.type = "button";
    sameBtn.className = "continue-create-btn continue-create-btn-primary";
    sameBtn.textContent = `Tiếp tục tạo ${kindLabel}`;
    actions.appendChild(otherBtn);
    actions.appendChild(sameBtn);

    dialog.appendChild(title);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const keydownAbort = new AbortController();
    const close = (result) => {
      keydownAbort.abort();
      overlay.remove();
      resolve(result);
    };

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") close(null);
      },
      { signal: keydownAbort.signal },
    );
    otherBtn.addEventListener("click", () => close("other"));
    sameBtn.addEventListener("click", () => close("same"));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
  });
}
