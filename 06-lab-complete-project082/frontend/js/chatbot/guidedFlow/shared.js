export const MSG_START_SOURCE =
  "Chào bạn! Để bắt đầu, bạn đã có tài liệu (PDF/Văn bản) sẵn chưa hay muốn tôi tự biên soạn theo chủ đề?";

/** Các nút “Tải lên PDF” ở bước chọn nguồn — cần chọn file trước khi vào form. */
export const PDF_SOURCE_ACTION_VALUES = new Set(["fullset_pdf", "slide_pdf", "quiz_pdf", "flash_pdf"]);

/** @type {Record<"fullset"|"slide"|"quiz"|"flash", { label: string, value: string }[]>} */
const SOURCE_ACTIONS_BY_KIND = {
  fullset: [
    { label: "Tải lên PDF", value: "fullset_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
  ],
  slide: [
    { label: "Tải lên PDF", value: "slide_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "slide_topic" },
  ],
  quiz: [
    { label: "Tải lên PDF", value: "quiz_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
  ],
  flash: [
    { label: "Tải lên PDF", value: "flash_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "flash_topic" },
  ],
};

/**
 * @param {"fullset"|"slide"|"quiz"|"flash"} kind
 * @returns {{ label: string, value: string }[]}
 */
export function getSourceActions(kind) {
  return SOURCE_ACTIONS_BY_KIND[kind] ? [...SOURCE_ACTIONS_BY_KIND[kind]] : [];
}

/** Tin nhắn bot trước form meta PDF (slide / quiz / flash). */
export function pdfMetaFormIntro(/** @type {"slide"|"quiz"|"flash"} */ kind) {
  if (kind === "slide") {
    return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bài giảng từ tài liệu của bạn:";
  }
  if (kind === "quiz") {
    return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ đề từ tài liệu của bạn:";
  }
  return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ flashcard từ tài liệu của bạn:";
}

/**
 * Lặp lại câu hỏi mở đầu + 2 nút khi người dùng hủy chọn PDF.
 * @param {"fullset"|"slide"|"quiz"|"flash"} kind
 * @returns {{ type: "pushBot", text: string, actions: { label: string, value: string }[] }[]}
 */
export function getRestartAwaitSourceEffects(kind) {
  const actions = getSourceActions(kind);
  if (!actions.length) return [];
  return [{ type: "pushBot", text: MSG_START_SOURCE, actions }];
}

