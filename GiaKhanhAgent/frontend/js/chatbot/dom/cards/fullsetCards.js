import { SAMPLES_FULLSET } from "../../data/sampleFlowData.js";
import {
  MSG_SKIP_USE_SUBMIT,
  MSG_SKIP_PDF_HAS_FILE,
  MSG_AUTO_CONFIRM_PDF,
  addAutofillBtn,
  autofillCounters,
  el,
  flowTextarea,
  normalizeFullsetCounts,
  randomFullsetTripleSum40,
  removeSkipConfirm,
  showAutoConfirmPanel,
  showPartialFillConfirm,
  wrapField,
  wrapMini,
} from "./flowCardShared.js";

export function createFullsetTopicCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Form Full Set"));

  const topic = flowTextarea("VD: Ôn tập đọc hiểu — chủ đề môi trường", 2);
  root.appendChild(wrapField("Chủ đề", topic, "Nhập tên bài học"));

  const level = el("select", "flow-select");
  ["", "Mất gốc", "Cơ bản", "Khá", "Nâng cao"].forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i === 0 ? "" : v;
    o.textContent = i === 0 ? "Chọn trình độ…" : v;
    level.appendChild(o);
  });
  root.appendChild(wrapField("Trình độ", level));

  const slides = el("input", "flow-input");
  slides.type = "number";
  slides.min = "1";
  slides.max = "30";
  slides.placeholder = "Slide";
  const quiz = el("input", "flow-input");
  quiz.type = "number";
  quiz.min = "1";
  quiz.placeholder = "Quiz";
  const flash = el("input", "flow-input");
  flash.type = "number";
  flash.min = "1";
  flash.placeholder = "Flashcard";
  const qtyWrap = el("div", "flow-field");
  qtyWrap.appendChild(el("span", "flow-label", "Số lượng (tổng max 40)"));
  const row = el("div", "flow-row-3");
  row.appendChild(wrapMini("Số slide", slides));
  row.appendChild(wrapMini("Số câu Quiz", quiz));
  row.appendChild(wrapMini("Số Flashcard", flash));
  qtyWrap.appendChild(row);
  qtyWrap.appendChild(
    el("p", "flow-hint", "Ba ô cộng lại tối đa 40 mục (ví dụ 10 slide + 20 quiz + 10 flashcard). Mỗi ô tối thiểu 1."),
  );
  root.appendChild(qtyWrap);

  const extra = flowTextarea("VD: Tông giọng hài hước, có minigame…", 3);
  root.appendChild(wrapField("Yêu cầu thêm", extra, ""));

  addAutofillBtn(root, () => {
    const s = SAMPLES_FULLSET[autofillCounters.fullset++ % SAMPLES_FULLSET.length];
    const { sn, qn, fn } = normalizeFullsetCounts(s.s, s.q, s.f);
    topic.value = s.t;
    level.value = s.l;
    slides.value = String(sn);
    quiz.value = String(qn);
    flash.value = String(fn);
    extra.value = s.e;
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

  function readFullsetState() {
    const t = topic.value.trim();
    const lv = level.value;
    const s = slides.value.trim();
    const q = quiz.value.trim();
    const f = flash.value.trim();
    const ex = extra.value.trim();
    const sn = Number(s);
    const qn = Number(q);
    const fn = Number(f);
    const sumOk = Number.isFinite(sn) && Number.isFinite(qn) && Number.isFinite(fn) && sn + qn + fn <= 40;
    const complete =
      Boolean(t) &&
      Boolean(lv) &&
      Number.isFinite(sn) &&
      sn >= 1 &&
      sn <= 30 &&
      Number.isFinite(qn) &&
      qn >= 1 &&
      Number.isFinite(fn) &&
      fn >= 1 &&
      sumOk;
    return { t, lv, s, q, f, ex, complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    err.textContent = "";
    const st = readFullsetState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    const { sn, qn, fn } = randomFullsetTripleSum40();
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      topic: "(Teachly tự động)",
      level: "Cơ bản",
      slides: String(sn),
      quiz: String(qn),
      flash: String(fn),
      extra: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    err.textContent = "";
    const sn = Number(slides.value);
    const qn = Number(quiz.value);
    const fn = Number(flash.value);
    if (!Number.isFinite(sn) || sn < 1 || sn > 30) {
      err.textContent = "Số slide phải từ 1 đến 30.";
      err.style.display = "block";
      return;
    }
    if (!Number.isFinite(qn) || qn < 1) {
      err.textContent = "Số câu Quiz phải là số dương.";
      err.style.display = "block";
      return;
    }
    if (!Number.isFinite(fn) || fn < 1) {
      err.textContent = "Số Flashcard phải là số dương.";
      err.style.display = "block";
      return;
    }
    const sum = sn + qn + fn;
    if (sum > 40) {
      err.textContent = `Tổng Slide + Quiz + Flashcard không được vượt quá 40 (hiện tại: ${sum}).`;
      err.style.display = "block";
      return;
    }
    const t = topic.value.trim();
    const lv = level.value;
    if (t && lv) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: t,
        level: lv,
        slides: String(sn),
        quiz: String(qn),
        flash: String(fn),
        extra: extra.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: t || "(Teachly tự động)",
        level: lv || "Cơ bản",
        slides: String(sn),
        quiz: String(qn),
        flash: String(fn),
        extra: extra.value.trim(),
      });
    });
  });

  return root;
}

export function createFullsetPdfCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Tải lên PDF"));

  const hint = el(
    "p",
    "flow-hint",
    "Giao diện chọn tệp (Chandra OCR2 → Markdown sẽ được kích hoạt ở bước tích hợp sau).",
  );
  root.appendChild(hint);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,application/pdf";
  input.style.display = "none";

  const name = el("span", "flow-file-name", "Chưa chọn tệp");
  const pick = el("button", "flow-secondary-btn", "Chọn file PDF");
  pick.type = "button";

  const row = el("div", "flow-file-row");
  row.appendChild(pick);
  row.appendChild(name);
  root.appendChild(row);
  root.appendChild(input);

  pick.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const f = input.files && input.files[0];
    name.textContent = f ? f.name : "Chưa chọn tệp";
  });

  addAutofillBtn(root, () => {
    const mockFile = new File(["dummy content"], "de_on_tap_anh_van.pdf", { type: "application/pdf" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(mockFile);
    input.files = dataTransfer.files;
    name.textContent = mockFile.name;
    input.dispatchEvent(new Event("change"));
  });

  if (deps.initialFile) {
    try {
      const dt = new DataTransfer();
      dt.items.add(deps.initialFile);
      input.files = dt.files;
      name.textContent = deps.initialFile.name;
    } catch {
      name.textContent = "Chưa chọn tệp";
    }
  }

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Xác nhận tệp");
  submit.type = "button";
  actions.appendChild(submit);
  actions.appendChild(skip);
  root.appendChild(actions);

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const f = input.files && input.files[0];
    if (f) {
      err.textContent = MSG_SKIP_PDF_HAS_FILE;
      err.style.display = "block";
      return;
    }
    showAutoConfirmPanel(
      root,
      err,
      () => {
        submit.disabled = true;
        skip.disabled = true;
        pick.disabled = true;
        deps.onSubmit({ __auto: "1", fileName: "" });
      },
      MSG_AUTO_CONFIRM_PDF,
    );
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const f = input.files && input.files[0];
    if (!f) {
      err.textContent = "Vui lòng chọn một tệp PDF.";
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ fileName: f.name });
  });

  return root;
}
