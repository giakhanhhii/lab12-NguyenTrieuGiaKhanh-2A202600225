/**
 * Chrome dùng chung cho quiz / slide / flashcard (tránh phình một component).
 */

const BOOK_SVG = `<svg class="exp-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;

const AI_SVG = `<svg class="exp-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2l1.09 3.26L16 6.18l-2.91 1.82L12 11l-1.09-3L8 6.18l2.91-1.82L12 2z"/><path d="M5 14l.84 2.53L8 17.3l-2.16 1.35L5 21l-.84-2.35L2 17.3l2.16-1.35L5 14z"/><path d="M19 14l.84 2.53L22 17.3l-2.16 1.35L19 21l-.84-2.35L16 17.3l2.16-1.35L19 14z"/></svg>`;

/**
 * @param {{ title: string, onAiEdit?: () => void }} p
 */
export function createExperienceTopBar(p) {
  const bar = document.createElement("div");
  bar.className = "exp-topbar";

  const left = document.createElement("div");
  left.className = "exp-topbar-left";
  left.innerHTML = `${BOOK_SVG}<span class="exp-topbar-title"></span>`;
  left.querySelector(".exp-topbar-title").textContent = p.title;

  const right = document.createElement("div");
  right.className = "exp-topbar-right";

  if (p.onAiEdit) {
    const aiBtn = document.createElement("button");
    aiBtn.type = "button";
    aiBtn.className = "exp-ai-btn";
    aiBtn.title = "Nhờ AI chỉnh sửa nội dung";
    aiBtn.setAttribute("aria-label", "Nhờ AI chỉnh sửa nội dung");
    aiBtn.innerHTML = `${AI_SVG}<span> AI sửa</span>`;
    aiBtn.addEventListener("click", () => p.onAiEdit?.());
    right.appendChild(aiBtn);
  }

  const share = document.createElement("button");
  share.type = "button";
  share.className = "exp-icon-btn";
  share.title = "Chia sẻ (sắp có)";
  share.setAttribute("aria-label", "Chia sẻ");
  share.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
  share.disabled = true;
  right.appendChild(share);

  bar.appendChild(left);
  bar.appendChild(right);
  return bar;
}

/**
 * @param {{ total: number, index: number, correct: number, wrong: number }} p
 */
export function createProgressRow(p) {
  const wrap = document.createElement("div");
  wrap.className = "exp-progress-wrap";

  const track = document.createElement("div");
  track.className = "exp-progress-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "0");

  const meta = document.createElement("div");
  meta.className = "exp-progress-meta";
  const countEl = document.createElement("span");
  countEl.className = "exp-progress-count";
  const badEl = document.createElement("span");
  badEl.className = "exp-pill exp-pill-bad";
  badEl.title = "Sai";
  const okEl = document.createElement("span");
  okEl.className = "exp-pill exp-pill-ok";
  okEl.title = "Đúng";
  meta.appendChild(countEl);
  meta.appendChild(badEl);
  meta.appendChild(okEl);

  function paint(state) {
    const total = Math.max(1, state.total);
    const idx = state.index;
    track.setAttribute("aria-valuemax", String(total));
    track.setAttribute("aria-valuenow", String(idx + 1));
    track.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const seg = document.createElement("div");
      seg.className = "exp-progress-seg" + (i <= idx ? " filled" : "");
      track.appendChild(seg);
    }
    countEl.textContent = `${idx + 1}/${total}`;
    badEl.innerHTML = `<span aria-hidden="true">✕</span> ${state.wrong}`;
    okEl.innerHTML = `<span aria-hidden="true">✓</span> ${state.correct}`;
  }

  paint({ total: p.total, index: p.index, correct: p.correct, wrong: p.wrong });
  wrap.appendChild(track);
  wrap.appendChild(meta);
  return { wrap, paint };
}

/**
 * @param {{ label: string, disabled?: boolean }} p
 */
export function createPrimaryNavButton(p) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "exp-next-btn";
  btn.textContent = p.label;
  btn.disabled = !!p.disabled;
  return btn;
}
