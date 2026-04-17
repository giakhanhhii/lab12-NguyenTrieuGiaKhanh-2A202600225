/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Nhiều đề gộp "A. … B. …" trên một dòng; tách dòng để khớp format đề in.
 * @param {string} s
 */
export function insertInlineMcLineBreaks(s) {
  if (!s) return s;
  let t = s.replace(/([:;?])\s+A\.\s/g, "$1\nA. ");
  t = t.replace(/\s+(?=[B-F]\.\s)/g, "\n");
  return t;
}

/**
 * Escape HTML + markdown bold đơn giản (**…**) + xuống dòng.
 * @param {string} s
 */
export function quizStemToSafeHtml(s) {
  const withBreaks = insertInlineMcLineBreaks(s);
  const esc = escapeHtml(withBreaks);
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

/**
 * @param {Record<string, string>} meta
 * @param {number} qIndex
 * @param {{ text?: string, options?: string[] }} question
 */
export function buildAiDraftQuiz(meta, qIndex, question) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const opts = (question.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
  return (
    `[Sửa đề quiz — nhờ AI]\n` +
    `Ngữ cảnh người dùng — Chủ đề: ${topic}; Số câu mong muốn: ${count}; Ghi chú: ${notes}\n` +
    `Câu hiện tại (${qIndex + 1}): ${question.text || ""}\n` +
    `${opts}\n\n` +
    `Hãy đề xuất phiên bản câu hỏi và phương án tốt hơn (giữ định dạng trắc nghiệm 4 lựa chọn), kèm đáp án đúng và gợi ý ngắn.`
  );
}

/**
 * @param {{ correctIndex?: number }[]} questions
 * @param {(number | null)[]} selectedByIndex
 * @param {boolean[]} gradedByIndex
 */
export function recomputeScore(questions, selectedByIndex, gradedByIndex) {
  let correct = 0;
  let wrong = 0;
  for (let i = 0; i < questions.length; i += 1) {
    if (!gradedByIndex[i]) continue;
    const q = questions[i];
    const picked = selectedByIndex[i];
    if (!q || picked === null) continue;
    if (picked === q.correctIndex) correct += 1;
    else wrong += 1;
  }
  return { correct, wrong };
}

/**
 * @param {{ options?: string[], correctIndex?: number, hint?: string }} question
 * @param {number | null} pickedIndex
 */
export function buildWrongExplanation(question, pickedIndex) {
  const picked = Number.isFinite(Number(pickedIndex)) ? Number(pickedIndex) : -1;
  const pickedText = picked >= 0 ? question?.options?.[picked] : "";
  const correctText = question?.options?.[question?.correctIndex ?? -1] || "";
  const base = question?.hint ? String(question.hint) : "Cần bám sát nghĩa trọng tâm và loại trừ đáp án nhiễu.";
  return `Bạn chọn "${pickedText || "không chọn"}" nên chưa đúng. Đáp án đúng là "${correctText}". ${base}`;
}
