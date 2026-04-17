import { SAMPLES_FLASH } from "../../data/sampleFlowData.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  autofillCounters,
  clamp,
  el,
  flowTextarea,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";

export function createFlashcardFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form Flashcard từ vựng"));

  const list = flowTextarea("Dán danh sách từ hoặc mô tả chủ đề… (có thể bỏ trống)", 4);
  root.appendChild(wrapField("Danh sách từ / Chủ đề", list, "Có thể bỏ qua — Teachly sẽ gợi ý theo ghi chú của bạn."));

  const back = flowTextarea("VD: Nghĩa tiếng Việt, Phiên âm, Ví dụ, Từ đồng nghĩa", 2);
  root.appendChild(wrapField("Thông tin mặt sau", back));

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "1";
  count.max = "40";
  count.placeholder = "1–40 (mặc định 20)";
  root.appendChild(wrapField("Số lượng thẻ", count, "Tối đa 40 thẻ mỗi lần tạo."));

  const notes = flowTextarea("Ghi chú thêm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  addAutofillBtn(root, () => {
    const s = SAMPLES_FLASH[autofillCounters.flash++ % SAMPLES_FLASH.length];
    list.value = s.l;
    back.value = s.b;
    count.value = String(clamp(toPositiveInt(s.c, 20), 1, 40));
    notes.value = s.n;
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

  function readFlashState() {
    const lst = list.value.trim();
    const bk = back.value.trim();
    const nt = notes.value.trim();
    const cv = count.value.trim();
    const n = Number(cv || "20");
    const mainDesc = lst || bk || nt;
    const complete = Boolean(mainDesc) && Number.isFinite(n) && n >= 1 && n <= 40;
    return { complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readFlashState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      list: "",
      back: "",
      count: "20",
      aiImage: "Không",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const cv = count.value.trim();
    if (cv) {
      const n = Number(cv);
      if (!Number.isFinite(n) || n < 1 || n > 40) {
        err.textContent = "Số lượng thẻ phải từ 1 đến 40.";
        err.style.display = "block";
        return;
      }
    }
    const lst = list.value.trim();
    const bk = back.value.trim();
    const nt = notes.value.trim();
    const mainDesc = lst || bk || nt;
    const useCount = cv || "20";
    if (cv && !mainDesc) {
      showPartialFillConfirm(root, err, () => {
        submit.disabled = true;
        skip.disabled = true;
        deps.onSubmit({
          list: "",
          back: "",
          count: useCount,
          aiImage: "Không",
          notes: "",
        });
      });
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      list: lst,
      back: bk,
      count: useCount,
      aiImage: "Không",
      notes: nt,
    });
  });

  return root;
}
