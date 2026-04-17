import { randomIntInclusive } from "../../services/sessionContentPrep.js";

export const autofillCounters = {
  fullset: 0,
  slide: 0,
  quiz: 0,
  flash: 0,
  meta: 0,
};

const MAGIC_WAND_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 2L7.12 6.12L3 8L7.12 9.88L9 14L10.88 9.88L15 8L10.88 6.12L9 2ZM17 14L15.88 16.12L13.76 17L15.88 17.88L17 20L18.12 17.88L20.24 17L18.12 16.12L17 14ZM19 3L18.25 4.75L16.5 5.5L18.25 6.25L19 8L19.75 6.25L21.5 5.5L19.75 4.75L19 3Z"/></svg>`;

export const MSG_SKIP_USE_SUBMIT = "Bạn đã điền đủ thông tin. Hãy nhấn Gửi thông tin để tiếp tục.";
export const MSG_SKIP_PDF_HAS_FILE =
  "Bạn đã chọn tệp PDF — nhấn Xác nhận tệp để tiếp tục, hoặc tải lại trang nếu muốn chọn lại.";
export const MSG_AUTO_CONFIRM = "Bạn chưa điền gì. Teachly sẽ tự động soạn nội dung phù hợp. Bạn có chắc không?";
export const MSG_AUTO_CONFIRM_PDF =
  "Bạn chưa chọn tệp PDF. Teachly sẽ tự động soạn nội dung phù hợp. Bạn có chắc không?";
export const MSG_PARTIAL_FILL =
  "Bạn mới điền số lượng (hoặc thông tin một phần), Teachly sẽ tự điền những thông tin còn lại cho bạn. Bạn có muốn tiếp tục không?";

export function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export function flowTextarea(placeholder, rows = 2) {
  const n = el("textarea", "flow-textarea");
  n.rows = rows;
  if (placeholder) n.placeholder = placeholder;
  n.title = "Enter hoặc Shift+Enter để xuống dòng";
  return n;
}

export function wrapField(labelText, control, hint) {
  const f = el("div", "flow-field");
  f.appendChild(el("label", "flow-label", labelText));
  f.appendChild(control);
  if (hint) f.appendChild(el("p", "flow-hint", hint));
  return f;
}

export function wrapMini(labelText, control) {
  const f = el("div", "flow-field");
  f.appendChild(el("span", "flow-label", labelText));
  f.appendChild(control);
  return f;
}

export function removeSkipConfirm(root) {
  root.querySelector(".flow-skip-confirm")?.remove();
}

export function showAutoConfirmPanel(root, errEl, onYes, message) {
  removeSkipConfirm(root);
  errEl.style.display = "none";
  const wrap = el("div", "flow-skip-confirm");
  wrap.appendChild(el("p", "flow-skip-text", message || MSG_AUTO_CONFIRM));
  const row = el("div", "flow-skip-actions");
  const yes = el("button", "flow-primary-btn", "Có, để Teachly tự động");
  const no = el("button", "flow-secondary-btn", "Không");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => {
    removeSkipConfirm(root);
    onYes();
  });
  no.addEventListener("click", () => removeSkipConfirm(root));
  row.appendChild(yes);
  row.appendChild(no);
  wrap.appendChild(row);
  root.appendChild(wrap);
}

export function showPartialFillConfirm(root, errEl, onYes) {
  removeSkipConfirm(root);
  errEl.style.display = "none";
  const wrap = el("div", "flow-skip-confirm");
  wrap.appendChild(el("p", "flow-skip-text", MSG_PARTIAL_FILL));
  const row = el("div", "flow-skip-actions");
  const yes = el("button", "flow-primary-btn", "Có");
  const no = el("button", "flow-secondary-btn", "Không");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => {
    removeSkipConfirm(root);
    onYes();
  });
  no.addEventListener("click", () => removeSkipConfirm(root));
  row.appendChild(yes);
  row.appendChild(no);
  wrap.appendChild(row);
  root.appendChild(wrap);
}

export function addAutofillBtn(root, callback) {
  const btn = el("button", "flow-autofill-btn");
  btn.type = "button";
  btn.title = "Tự động điền dữ liệu mẫu (AI)";
  btn.innerHTML = MAGIC_WAND_SVG;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    callback();
  });
  root.appendChild(btn);
}

export function randomCountSkipPdf(countMax) {
  const hi = countMax == null ? 40 : Math.min(40, countMax);
  const lo = Math.min(20, hi);
  return randomIntInclusive(lo, hi);
}

export function randomFullsetTripleSum40() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const cut1 = randomIntInclusive(1, 38);
    const cut2 = randomIntInclusive(cut1 + 1, 39);
    const sn = cut1;
    const qn = cut2 - cut1;
    const fn = 40 - cut2;
    if (sn <= 30 && qn >= 1 && fn >= 1) return { sn, qn, fn };
  }
  return { sn: 10, qn: 20, fn: 10 };
}

export function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const int = Math.floor(n);
  return int > 0 ? int : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeFullsetCounts(slideRaw, quizRaw, flashRaw) {
  let sn = clamp(toPositiveInt(slideRaw, 10), 1, 30);
  let qn = toPositiveInt(quizRaw, 20);
  let fn = toPositiveInt(flashRaw, 10);

  if (qn < 1) qn = 1;
  if (fn < 1) fn = 1;

  if (sn + qn + fn <= 40) return { sn, qn, fn };

  sn = Math.min(sn, 38);
  let remaining = 40 - sn;
  qn = Math.min(qn, Math.max(1, remaining - 1));
  remaining = 40 - sn - qn;
  fn = Math.max(1, remaining);
  return { sn, qn, fn };
}
