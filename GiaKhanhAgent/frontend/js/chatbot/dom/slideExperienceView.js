import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareSlideSessionData } from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

/**
 * @param {Record<string, string>} meta
 * @param {number} sIndex
 * @param {{ title: string, bullets?: string[] }} slide
 */
function buildAiDraftSlide(meta, sIndex, slide) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const bullets = (slide.bullets || []).map((b) => `• ${b}`).join("\n");
  return (
    `[Sửa slide — nhờ AI]\n` +
    `Ngữ cảnh — Chủ đề: ${topic}; Số slide (yêu cầu): ${count}; Ghi chú: ${notes}\n` +
    `Slide hiện tại (${sIndex + 1}) — Tiêu đề: ${slide.title}\n${bullets}\n\n` +
    `Hãy đề xuất lại tiêu đề và gạch đầu dòng rõ ràng hơn cho học sinh ôn THPT.`
  );
}

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountSlideExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  const root = layerView.body;
  const raw = await fetchMockResource("slide");
  const data = prepareSlideSessionData(raw, meta);
  const deckTitle = data.title || "Bộ slide";
  const slides = Array.isArray(data.slides) ? data.slides : [];

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  const total = Math.max(1, slides.length);
  index = Math.min(Math.max(0, index), Math.max(0, slides.length - 1));

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-slide";

  const onAi = () => {
    const s = slides[index];
    if (!s || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftSlide(meta, index, s));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: deckTitle,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }),
  );

  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  summary.textContent = `Đã ghi nhận — Chủ đề: ${meta.topic || "—"} | Số slide (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.notes || "—"}`;
  shell.appendChild(summary);

  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);

  const stage = document.createElement("div");
  stage.className = "exp-stage exp-slide-stage";
  shell.appendChild(stage);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: slides.length === 0 });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "slide",
      meta: { ...meta },
      title: deckTitle,
      total: slides.length,
      index,
    });
  }

  function renderSlide() {
    const s = slides[index];
    stage.innerHTML = "";
    if (!s) {
      stage.innerHTML = `<p class="exp-empty">Không có slide trong bộ mock.</p>`;
      backBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    const h = document.createElement("h2");
    h.className = "exp-slide-title";
    h.textContent = s.title || "";
    const ul = document.createElement("ul");
    ul.className = "exp-slide-bullets";
    (s.bullets || []).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    });
    stage.appendChild(h);
    stage.appendChild(ul);
    progress.paint({ total, index, correct: 0, wrong: 0 });
    backBtn.disabled = index <= 0;
    nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    nextBtn.disabled = false;
    emitState();
  }

  backBtn.addEventListener("click", () => {
    if (index <= 0) return;
    index -= 1;
    renderSlide();
  });

  nextBtn.addEventListener("click", () => {
    if (total <= 1 || index >= total - 1) {
      deps?.onContinueCreate?.("slide");
      return;
    }
    index += 1;
    renderSlide();
  });

  root.appendChild(shell);
  renderSlide();
}
