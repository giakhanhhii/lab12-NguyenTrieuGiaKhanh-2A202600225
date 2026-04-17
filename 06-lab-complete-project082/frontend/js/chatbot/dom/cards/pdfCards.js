import {
  MSG_SKIP_PDF_HAS_FILE,
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  clamp,
  el,
  flowTextarea,
  randomCountSkipPdf,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";

function createPdfMetaCard(opts) {
  const { title, countLabel, countMin, countMax, defaultCount, onSubmit } = opts;
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", title));

  const name = flowTextarea("VD: Bài 8 — Động lực học", 2);
  root.appendChild(wrapField("Tên", name, "Tên gọi bộ nội dung / phiên làm việc"));

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = String(countMin);
  if (countMax != null) count.max = String(countMax);
  count.placeholder = countMax != null ? `${countMin}–${countMax}` : `≥ ${countMin}`;
  root.appendChild(wrapField(countLabel, count, ""));

  const structure = flowTextarea("VD: Mở đầu → Nội dung chính → Củng cố", 2);
  root.appendChild(wrapField("Cấu trúc", structure, ""));

  const style = flowTextarea("VD: Trang trọng, gần gũi, hài hước…", 2);
  root.appendChild(wrapField("Phong cách", style, ""));

  const notes = flowTextarea("Yêu cầu bổ sung, ngữ cảnh lớp học…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes, ""));

  addAutofillBtn(root, () => {
    name.value = "Bài tập từ PDF";
    const max = countMax == null ? Number.MAX_SAFE_INTEGER : countMax;
    const defaultNum = clamp(toPositiveInt(defaultCount, 20), countMin, max);
    count.value = String(defaultNum);
    structure.value = "Tự động phân tích từ tài liệu";
    style.value = "Gần gũi";
    notes.value = "Bám sát nội dung tệp PDF đã tải lên.";
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

  function readState() {
    const nm = name.value.trim();
    const c = count.value.trim();
    const n = Number(c);
    const st = structure.value.trim();
    const sy = style.value.trim();
    const nt = notes.value.trim();
    const inRange =
      Number.isFinite(n) &&
      n >= countMin &&
      (countMax == null || (n <= countMax && n >= countMin));
    const complete = Boolean(nm) && Boolean(c) && inRange;
    return { nm, n, c, st, sy, nt, complete, inRange };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    onSubmit({
      __auto: "1",
      name: "(Teachly tự động)",
      count: String(randomCountSkipPdf(countMax)),
      structure: "",
      style: "",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const st = readState();
    if (st.nm && st.c && st.inRange) {
      submit.disabled = true;
      skip.disabled = true;
      onSubmit({
        name: st.nm,
        count: String(st.n),
        structure: st.st,
        style: st.sy,
        notes: st.nt,
      });
      return;
    }
    if (st.c && st.inRange && !st.nm) {
      showPartialFillConfirm(root, err, () => {
        submit.disabled = true;
        skip.disabled = true;
        onSubmit({
          name: "(Teachly tự động)",
          count: String(st.n),
          structure: st.st,
          style: st.sy,
          notes: st.nt,
        });
      });
      return;
    }
    if (!st.c || !st.inRange) {
      err.textContent =
        countMax != null
          ? `Số lượng phải từ ${countMin} đến ${countMax}.`
          : `Số lượng phải là số ≥ ${countMin}.`;
      err.style.display = "block";
      return;
    }
    err.textContent = "Vui lòng nhập tên.";
    err.style.display = "block";
  });

  return root;
}

export function createSlidePdfMetaCard(onSubmit) {
  return createPdfMetaCard({
    title: "Form Slide (PDF)",
    countLabel: "Số lượng slide",
    countMin: 1,
    countMax: 30,
    defaultCount: "10",
    onSubmit,
  });
}

export function createQuizPdfMetaCard(onSubmit) {
  return createPdfMetaCard({
    title: "Form Quiz (PDF)",
    countLabel: "Số lượng câu hỏi",
    countMin: 1,
    countMax: null,
    defaultCount: "15",
    onSubmit,
  });
}

export function createFlashPdfMetaCard(onSubmit) {
  return createPdfMetaCard({
    title: "Form Flashcard (PDF)",
    countLabel: "Số lượng thẻ",
    countMin: 1,
    countMax: 500,
    defaultCount: "20",
    onSubmit,
  });
}

export function createPickPdfGateCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Chọn tệp PDF"));
  root.appendChild(
    el("p", "flow-hint", "Chọn một tệp .pdf, sau đó nhấn Tiếp tục. Teachly sẽ hiển thị biểu mẫu chi tiết ở bước sau."),
  );

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

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Tiếp tục");
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
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ __no_file: "1" });
  });

  submit.addEventListener("click", () => {
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
