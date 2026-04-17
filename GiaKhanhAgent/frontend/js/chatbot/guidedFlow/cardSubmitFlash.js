/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFlashCardSubmit(guided, cardType, payload) {
  if (guided.kind === "flash" && guided.step === "await_pdf_meta" && cardType === "flash_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const extra = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp PDF: ${pdfFn}` : "",
      "Nguồn: PDF",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: payload.name || "—",
      count: payload.count || "—",
      extra: extra || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard — PDF] ${meta.source} — ${meta.count} thẻ` },
        { type: "showFlash", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_topic_form" && cardType === "flash_form") {
    const src = payload.list || "(Teachly gợi ý theo ghi chú)";
    const extra = [payload.back ? `Mặt sau: ${payload.back}` : "", payload.aiImage ? `Hình AI: ${payload.aiImage}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : ""]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: src,
      count: String(payload.count || "20").trim() || "20",
      extra: extra || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard] ${src}` },
        { type: "showFlash", meta },
      ],
    };
  }

  return null;
}

