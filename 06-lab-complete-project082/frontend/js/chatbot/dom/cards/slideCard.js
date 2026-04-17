import { SAMPLES_SLIDE } from "../../data/sampleFlowData.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  autofillCounters,
  clamp,
  el,
  flowTextarea,
  normalizeFullsetCounts,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";

export function createSlideFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form tạo slide bài giảng"));

  const docText = flowTextarea("Nhập tên bài học / chủ đề…", 2);
  const docBlock = el("div", "flow-field");
  docBlock.appendChild(el("label", "flow-label", "Chủ đề bài giảng"));
  docBlock.appendChild(docText);
  docBlock.appendChild(el("p", "flow-hint", "Bạn đã chọn nhập chủ đề trực tiếp — mô tả rõ nội dung mong muốn."));
  root.appendChild(docBlock);

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "1";
  count.max = "30";
  count.placeholder = "1–30";
  root.appendChild(wrapField("Số lượng slide", count, "Tối đa 30 slide để đảm bảo chất lượng nội dung."));

  const structure = flowTextarea("VD: Lý thuyết → Ví dụ → Tổng kết", 2);
  root.appendChild(wrapField("Cấu trúc mong muốn", structure));

  const style = el("select", "flow-select");
  ["", "Trang trọng", "Gần gũi", "Hài hước"].forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i === 0 ? "" : v;
    o.textContent = i === 0 ? "Chọn phong cách…" : v;
    style.appendChild(o);
  });
  root.appendChild(wrapField("Phong cách", style));

  const notes = flowTextarea("VD: Minigame, Thảo luận nhóm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  addAutofillBtn(root, () => {
    const s = SAMPLES_SLIDE[autofillCounters.slide++ % SAMPLES_SLIDE.length];
    docText.value = s.t;
    count.value = String(clamp(toPositiveInt(s.c, 10), 1, 30));
    structure.value = s.s;
    style.value = s.y;
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

  function readSlideState() {
    const topic = docText.value.trim();
    const n = Number(count.value);
    const sty = style.value;
    const complete = Boolean(topic) && Number.isFinite(n) && n >= 1 && n <= 30 && Boolean(sty);
    return { topic, n, sty, complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readSlideState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      topic: "(Teachly tự động)",
      count: "20",
      structure: "",
      style: "Gần gũi",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const n = Number(count.value);
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      err.textContent = "Số slide phải từ 1 đến 30.";
      err.style.display = "block";
      return;
    }
    const topic = docText.value.trim();
    const sty = style.value;
    if (topic && sty) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic,
        count: String(n),
        structure: structure.value.trim(),
        style: sty,
        notes: notes.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: topic || "(Teachly tự động)",
        count: String(n),
        structure: structure.value.trim(),
        style: sty || "Gần gũi",
        notes: notes.value.trim(),
      });
    });
  });

  return root;
}
