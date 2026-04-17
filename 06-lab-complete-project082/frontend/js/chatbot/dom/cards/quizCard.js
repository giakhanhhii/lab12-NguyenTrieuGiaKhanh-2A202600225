import { SAMPLES_QUIZ } from "../../data/sampleFlowData.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  autofillCounters,
  el,
  flowTextarea,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";

export function createQuizFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form Quiz (THPTQG)"));

  const srcText = flowTextarea("Nhập chủ đề / chuyên đề…", 2);
  const src = el("div", "flow-field");
  src.appendChild(el("label", "flow-label", "Chủ đề / chuyên đề"));
  src.appendChild(srcText);
  src.appendChild(el("p", "flow-hint", "Bạn đã chọn nhập chủ đề trực tiếp — không cần tải tệp ở bước này."));
  root.appendChild(src);

  const kind = flowTextarea("VD: Phát âm, Ngữ pháp, Đọc hiểu, Từ vựng", 2);
  root.appendChild(wrapField("Dạng bài", kind));

  const qn = el("input", "flow-input");
  qn.type = "number";
  qn.min = "1";
  qn.placeholder = "VD: 20";
  root.appendChild(wrapField("Số lượng câu", qn));

  const diff = flowTextarea("VD: 40% NB - 30% TH - 20% VD - 10% VDC", 2);
  root.appendChild(wrapField("Tỉ lệ độ khó", diff));

  const notes = flowTextarea("Ghi chú thêm cho bộ đề…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  addAutofillBtn(root, () => {
    const item = SAMPLES_QUIZ[autofillCounters.quiz++ % SAMPLES_QUIZ.length];
    srcText.value = item.s;
    kind.value = item.k;
    qn.value = String(toPositiveInt(item.q, 20));
    diff.value = item.d;
    notes.value = item.n;
  });

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Gửi thông tin");
  submit.type = "button";
  actions.appendChild(submit);
  actions.appendChild(skip);
  root.appendChild(actions);

  function readQuizState() {
    const t = srcText.value.trim();
    const k = kind.value.trim();
    const n = Number(qn.value);
    const complete = Boolean(t) && Number.isFinite(n) && n >= 1 && Boolean(k);
    return { t, k, n, complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readQuizState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      source: "(Teachly tự động)",
      kind: "Ôn tập THPTQG",
      count: "20",
      difficulty: "",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const n = Number(qn.value);
    if (!Number.isFinite(n) || n < 1) {
      err.textContent = "Số lượng câu phải là số dương.";
      err.style.display = "block";
      return;
    }
    const t = srcText.value.trim();
    const k = kind.value.trim();
    if (t && k) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t,
        kind: k,
        count: String(n),
        difficulty: diff.value.trim(),
        notes: notes.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t || "(Teachly tự động)",
        kind: k || "Ôn tập THPTQG",
        count: String(n),
        difficulty: diff.value.trim(),
        notes: notes.value.trim(),
      });
    });
  });

  return root;
}
