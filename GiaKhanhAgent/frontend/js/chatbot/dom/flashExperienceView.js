import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareFlashSessionData } from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Viết hoa chữ cái đầu mặt trước / mặt sau thẻ. */
function capitalizeFirst(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
}

import { speakFlashcard, FLASH_SOUND_SVG, hookFlashSpeechVoicesOnce } from "../services/speechService.js";

/**
 * @param {Record<string, string>} meta
 * @param {number} cIndex
 * @param {{ front: string, back: string }} card
 */
function buildAiDraftFlash(meta, cIndex, card) {
  const src = meta.source || "—";
  const count = meta.count || "—";
  const notes = meta.extra || meta.notes || "—";
  return (
    `[Sửa flashcard — nhờ AI]\n` +
    `Ngữ cảnh — Nguồn: ${src}; Số thẻ (yêu cầu): ${count}; Ghi chú: ${notes}\n` +
    `Thẻ hiện tại (${cIndex + 1}) — Mặt trước: ${card.front}\nMặt sau: ${card.back}\n\n` +
    `Hãy đề xuất cặp từ / nghĩa hoặc ví dụ câu hay hơn.`
  );
}

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountFlashExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const experienceBody = layerView.body;

  const raw = await fetchMockResource("flashcard");
  const data = prepareFlashSessionData(raw, meta);
  const titleText = data.title || "Flashcard";
  const cards = Array.isArray(data.cards) ? data.cards : [];

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  const total = Math.max(1, cards.length);
  index = Math.min(Math.max(0, index), Math.max(0, cards.length - 1));
  /** @type {boolean[]} */
  const flippedByIndex = Array.from({ length: cards.length }, (_, i) => {
    const arr = Array.isArray(initial?.flippedByIndex) ? initial.flippedByIndex : [];
    return Boolean(arr[i]);
  });

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-flash";

  const onAi = () => {
    const c = cards[index];
    if (!c || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftFlash(meta, index, c));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }),
  );

  const metaEl = document.createElement("p");
  metaEl.className = "exp-meta-line";
  metaEl.textContent = `Đã ghi nhận — Nguồn: ${meta.source || "—"} | Số thẻ (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.extra || "—"}`;
  shell.appendChild(metaEl);

  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);

  const hint = document.createElement("p");
  hint.className = "flash-hint";
  hint.textContent = "Nhấn vào thẻ để lật. Dùng Tiếp theo để sang thẻ khác.";
  shell.appendChild(hint);

  const cardSlot = document.createElement("div");
  cardSlot.className = "flash-slot";
  shell.appendChild(cardSlot);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: cards.length === 0 });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "flash",
      meta: { ...meta },
      title: titleText,
      total: cards.length,
      index,
      flippedByIndex: [...flippedByIndex],
    });
  }

  function renderCard() {
    const c = cards[index];
    cardSlot.innerHTML = "";
    if (!c) {
      cardSlot.innerHTML = `<p class="exp-empty">Không có thẻ trong bộ mock.</p>`;
      backBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "flash-wrap";
    const frame = document.createElement("div");
    frame.className = "flash-card-frame";

    const inner = document.createElement("div");
    inner.className = "flash-card";
    inner.setAttribute("role", "button");
    inner.tabIndex = 0;

    const frontTerm = escapeHtml(capitalizeFirst(c.front));
    const backText = escapeHtml(capitalizeFirst(c.back));
    const phoneticBlock = c.phonetic ? `<div class="flash-phonetic">${escapeHtml(c.phonetic)}</div>` : "";
    const hintBlock = c.hint ? `<div class="flash-mini-hint">${escapeHtml(c.hint)}</div>` : "";

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

    // Hàm tạo nút loa để gắn vào cả 2 mặt
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
        speakFlashcard(c);
      });
      btn.addEventListener("animationend", () => {
        btn.classList.remove("flash-sound-anim");
      });
      faceEl.appendChild(btn);
    };

    addSoundBtn(inner.querySelector(".flash-front"));
    addSoundBtn(inner.querySelector(".flash-back"));

    const syncFlipped = () => {
      flippedByIndex[index] = inner.classList.contains("flipped");
      emitState();
    };
    if (flippedByIndex[index]) inner.classList.add("flipped");
    inner.addEventListener("click", () => {
      inner.classList.toggle("flipped");
      syncFlipped();
    });
    inner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inner.classList.toggle("flipped");
        syncFlipped();
      }
    });

    frame.appendChild(inner);
    wrap.appendChild(frame);
    cardSlot.appendChild(wrap);

    progress.paint({ total, index, correct: 0, wrong: 0 });
    backBtn.disabled = index <= 0;
    nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    nextBtn.disabled = false;
    emitState();
  }

  backBtn.addEventListener("click", () => {
    if (index <= 0) return;
    index -= 1;
    renderCard();
  });

  nextBtn.addEventListener("click", () => {
    if (total <= 1 || index >= total - 1) {
      deps?.onContinueCreate?.("flash");
      return;
    }
    index += 1;
    renderCard();
  });

  experienceBody.appendChild(shell);
  renderCard();
}
