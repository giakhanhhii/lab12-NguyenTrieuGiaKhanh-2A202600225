/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeQuizCardSubmit(guided, cardType, payload) {
  if (guided.kind === "quiz" && guided.step === "await_pdf_meta" && cardType === "quiz_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const topic = [payload.name, "Từ PDF"].filter(Boolean).join(" — ") || "—";
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp PDF: ${pdfFn}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic,
      count: payload.count || "—",
      notes: notes || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz — PDF] ${payload.name || "—"} — ${meta.count} câu`,
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  if (guided.kind === "quiz" && guided.step === "await_topic_form" && cardType === "quiz_form") {
    const topic = [payload.source, payload.kind].filter(Boolean).join(" — ") || "—";
    const notes = [payload.difficulty ? `Tỉ lệ độ khó: ${payload.difficulty}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : ""]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic,
      count: payload.count || "—",
      notes: notes || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz THPTQG] ${meta.topic} — ${meta.count} câu`,
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  return null;
}

