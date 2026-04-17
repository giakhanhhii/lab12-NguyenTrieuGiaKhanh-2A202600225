import { FLASH_SOUND_SVG, hookFlashSpeechVoicesOnce, speakFlashcard } from "../services/speechService.js";
import {
  capitalizeFirst,
  escapeHtml,
  quizCorrectOptionIndex,
  quizOptionList,
  quizStemToSafeHtml,
} from "../services/fullSetMixedService.js";

/**
 * @param {"slide"|"quiz"|"flash"} kind
 */
export function createStepBadge(kind) {
  const badge = document.createElement("div");
  badge.className = "exp-mixed-kind-badge";
  badge.textContent = kind === "quiz" ? "Trắc nghiệm" : kind === "slide" ? "Slide bài giảng" : "Flashcard";
  return badge;
}

/**
 * @param {HTMLElement} stage
 * @param {any} slide
 */
export function renderSlideStep(stage, slide) {
  const h = document.createElement("h2");
  h.className = "exp-slide-title";
  h.textContent = slide.title || "";
  const ul = document.createElement("ul");
  ul.className = "exp-slide-bullets";
  (slide.bullets || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  });
  stage.appendChild(h);
  stage.appendChild(ul);
}

/**
 * @param {HTMLElement} stage
 * @param {any} card
 */
export function renderFlashStep(stage, card) {
  hookFlashSpeechVoicesOnce();
  const wrap = document.createElement("div");
  wrap.className = "flash-wrap";
  const frame = document.createElement("div");
  frame.className = "flash-card-frame";
  const inner = document.createElement("div");
  inner.className = "flash-card";
  inner.setAttribute("role", "button");
  inner.tabIndex = 0;
  const frontTerm = escapeHtml(capitalizeFirst(card.front));
  const backText = escapeHtml(capitalizeFirst(card.back));
  const phoneticBlock = card.phonetic ? `<div class="flash-phonetic">${escapeHtml(card.phonetic)}</div>` : "";
  const hintBlock = card.hint ? `<div class="flash-mini-hint">${escapeHtml(card.hint)}</div>` : "";
  inner.innerHTML = `
    <div class="flash-face flash-front">
      <div class="flash-front-stack">
        <span class="flash-front-term">${frontTerm}</span>
        ${phoneticBlock}
        ${hintBlock}
      </div>
    </div>
    <div class="flash-face flash-back">
      <span class="flash-back-text">${backText}</span>
    </div>
  `;

  const addSoundBtn = (faceEl) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flash-sound-btn";
    btn.setAttribute("aria-label", "Phát âm");
    btn.innerHTML = FLASH_SOUND_SVG;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      btn.classList.remove("flash-sound-anim");
      void btn.offsetWidth;
      btn.classList.add("flash-sound-anim");
      speakFlashcard(card);
    });
    btn.addEventListener("animationend", () => {
      btn.classList.remove("flash-sound-anim");
    });
    faceEl?.appendChild(btn);
  };

  addSoundBtn(inner.querySelector(".flash-front"));
  addSoundBtn(inner.querySelector(".flash-back"));

  inner.addEventListener("click", () => inner.classList.toggle("flipped"));
  inner.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inner.classList.toggle("flipped");
    }
  });

  frame.appendChild(inner);
  wrap.appendChild(frame);
  stage.appendChild(wrap);
}

/**
 * @param {HTMLElement} stage
 * @param {{
 *  index: number,
 *  question: any,
 *  selected: number | null,
 *  revealed: boolean,
 *  onPick: (index: number) => void
 * }} params
 */
export function renderQuizStep(stage, params) {
  const { index, question, selected, revealed, onPick } = params;
  const opts = quizOptionList(question);
  const num = document.createElement("div");
  num.className = "exp-q-number";
  num.textContent = `${index + 1}.`;
  const text = document.createElement("p");
  text.className = "exp-q-text";
  text.innerHTML = quizStemToSafeHtml(question.text || "");
  stage.appendChild(num);
  stage.appendChild(text);

  if (opts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    empty.textContent = "Câu hỏi chưa có phương án — nhấn Tiếp theo để bỏ qua.";
    stage.appendChild(empty);
    return { canProceed: true };
  }

  const optsWrap = document.createElement("div");
  optsWrap.className = "exp-option-grid";
  const letters = ["A", "B", "C", "D", "E", "F"];

  opts.forEach((opt, j) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "exp-opt-btn";
    b.textContent = `${letters[j] || j}. ${opt}`;
    b.addEventListener("click", () => {
      if (revealed) return;
      optsWrap.querySelectorAll(".exp-opt-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      onPick(j);
    });
    if (selected === j) b.classList.add("selected");
    optsWrap.appendChild(b);
  });

  const hintToggle = document.createElement("button");
  hintToggle.type = "button";
  hintToggle.className = "exp-hint-toggle";
  hintToggle.innerHTML = `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
  const hintPanel = document.createElement("div");
  hintPanel.className = "exp-hint-panel";
  hintPanel.hidden = true;
  hintPanel.textContent = question.hint || "(Chưa có gợi ý.)";
  let hintOpen = false;
  hintToggle.addEventListener("click", () => {
    hintOpen = !hintOpen;
    hintPanel.hidden = !hintOpen;
    hintToggle.innerHTML = hintOpen
      ? `Ẩn gợi ý <span class="exp-chevron exp-chevron-up" aria-hidden="true">▾</span>`
      : `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
  });

  const pickHint = document.createElement("p");
  pickHint.className = "exp-mixed-pick-hint";
  pickHint.textContent = "Chọn một đáp án, nhấn Tiếp theo để xem đúng/sai, rồi Tiếp theo lần nữa để sang mục kế tiếp.";

  stage.appendChild(optsWrap);
  stage.appendChild(pickHint);
  stage.appendChild(hintToggle);
  stage.appendChild(hintPanel);

  if (revealed) {
    applyQuizRevealStyles(optsWrap, question, selected);
    return { canProceed: true };
  }
  return { canProceed: selected != null };
}

/**
 * @param {ParentNode} container
 * @param {any} question
 * @param {number | null} picked
 */
export function applyQuizRevealStyles(container, question, picked) {
  const correctIdx = quizCorrectOptionIndex(question);
  container.querySelectorAll(".exp-opt-btn").forEach((btn, j) => {
    if (j === correctIdx) btn.classList.add("correct");
    if (picked !== null && j === picked && j !== correctIdx) btn.classList.add("wrong");
    /** @type {HTMLButtonElement} */ (btn).disabled = true;
  });
}

