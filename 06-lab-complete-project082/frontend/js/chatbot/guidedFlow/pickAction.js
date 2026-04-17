import { pdfMetaFormIntro } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} value
 * @param {{ pdfFile?: File | null }} [opts]
 */
export function computePickAction(guided, value, opts = {}) {
  const pdfFile = opts.pdfFile instanceof File ? opts.pdfFile : null;
  if (!guided || guided.step !== "await_source") {
    return { handled: false, guided, effects: [] };
  }

  if (guided.kind === "fullset") {
    return handleFullsetPick(guided, value);
  }
  if (guided.kind === "slide" || guided.kind === "quiz" || guided.kind === "flash") {
    return handleSingleModePick(guided, value, pdfFile);
  }
  return { handled: false, guided, effects: [] };
}

function handleFullsetPick(guided, value) {
  if (value === "fullset_pdf") {
    return {
      handled: true,
      guided: { kind: "fullset", step: "await_pdf_confirm", data: {} },
      effects: [
        { type: "pushUser", text: "Tải lên PDF" },
        {
          type: "pushBot",
          text:
            "Bạn đã chọn tải lên PDF.\n\nKhi tích hợp xong, Teachly sẽ dùng Chandra OCR2 để chuyển nội dung sang Markdown. Hiện tại bạn chỉ cần chọn tệp bên dưới để hoàn tất bước chuẩn bị trên giao diện.",
          cardType: "fullset_pdf",
        },
      ],
    };
  }
  if (value === "fullset_topic") {
    return {
      handled: true,
      guided: { kind: "fullset", step: "await_topic_form", data: {} },
      effects: [
        { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
        {
          type: "pushBot",
          text: "Tuyệt vời! Bạn hãy hoàn thiện nhanh các thông tin dưới đây để Teachly bắt đầu soạn Full Set nhé:",
          cardType: "fullset_topic",
        },
      ],
    };
  }
  return { handled: false, guided, effects: [] };
}

/**
 * @param {any} guided
 * @param {string} value
 * @param {File | null} pdfFile
 */
function handleSingleModePick(guided, value, pdfFile) {
  const kind = guided.kind;
  const sourceValue = `${kind}_pdf`;
  const topicValue = `${kind}_topic`;
  const metaCardType = `${kind}_pdf_meta`;
  const topicCardType = kind === "slide" ? "slide_form" : kind === "quiz" ? "quiz_form" : "flash_form";

  if (value === sourceValue) {
    if (pdfFile) {
      const fileName = pdfFile.name;
      return {
        handled: true,
        guided: { kind, step: "await_pdf_meta", data: { pdfFileName: fileName } },
        effects: [
          { type: "pushUser", text: `Tải lên PDF — ${fileName}` },
          { type: "pushBot", text: pdfMetaFormIntro(kind), cardType: metaCardType },
        ],
      };
    }
    return {
      handled: true,
      guided: { kind, step: "await_pdf_file", data: {} },
      effects: [
        { type: "pushUser", text: "Tải lên PDF" },
        { type: "pushBot", text: "", cardType: "pick_pdf_gate" },
      ],
    };
  }

  if (value === topicValue) {
    return {
      handled: true,
      guided: { kind, step: "await_topic_form", data: {} },
      effects: [
        { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
        { type: "pushBot", text: topicIntro(kind), cardType: topicCardType },
      ],
    };
  }

  return { handled: false, guided, effects: [] };
}

/** @param {"slide"|"quiz"|"flash"} kind */
function topicIntro(kind) {
  if (kind === "slide") return "Tuyệt vời! Điền thông tin dưới đây để Teachly thiết kế slide bài giảng cho bạn:";
  if (kind === "quiz") return "Tuyệt vời! Thiết lập thông số cho bộ câu hỏi của bạn tại đây:";
  return "Tuyệt vời! Cung cấp thông tin để Teachly tạo bộ Flashcard cho bạn:";
}

