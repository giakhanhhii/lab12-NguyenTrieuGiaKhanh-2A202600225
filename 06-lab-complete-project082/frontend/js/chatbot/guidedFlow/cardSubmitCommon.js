import { MSG_START_SOURCE, getSourceActions, pdfMetaFormIntro } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computePdfGateCardSubmit(guided, cardType, payload) {
  if (
    (guided.kind !== "slide" && guided.kind !== "quiz" && guided.kind !== "flash") ||
    guided.step !== "await_pdf_file" ||
    cardType !== "pick_pdf_gate"
  ) {
    return null;
  }

  if (payload.__no_file === "1") {
    return {
      handled: true,
      guided: { kind: guided.kind, step: "await_source", data: {} },
      effects: [
        { type: "pushUser", text: "Bỏ qua" },
        {
          type: "pushBot",
          text: MSG_START_SOURCE,
          actions: getSourceActions(guided.kind),
        },
      ],
    };
  }

  const fileName = payload.fileName || "";
  if (!fileName) return { handled: false, guided, effects: [] };

  const baseData = guided.data && typeof guided.data === "object" ? guided.data : {};
  const nextGuided = { ...guided, step: "await_pdf_meta", data: { ...baseData, pdfFileName: fileName } };
  const card = guided.kind === "slide" ? "slide_pdf_meta" : guided.kind === "quiz" ? "quiz_pdf_meta" : "flash_pdf_meta";

  return {
    handled: true,
    guided: nextGuided,
    effects: [
      { type: "pushUser", text: `Đã chọn tệp PDF: ${fileName}` },
      { type: "pushBot", text: pdfMetaFormIntro(guided.kind), cardType: card },
    ],
  };
}

