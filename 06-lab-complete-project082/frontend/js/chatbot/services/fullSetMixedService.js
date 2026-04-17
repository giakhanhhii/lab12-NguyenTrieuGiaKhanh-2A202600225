/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function capitalizeFirst(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
}

export function insertInlineMcLineBreaks(s) {
  if (!s) return s;
  let t = s.replace(/([:;?])\s+A\.\s/g, "$1\nA. ");
  t = t.replace(/\s+(?=[B-F]\.\s)/g, "\n");
  return t;
}

export function quizStemToSafeHtml(s) {
  const withBreaks = insertInlineMcLineBreaks(s);
  const esc = escapeHtml(withBreaks);
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

/** @param {any} q */
export function quizOptionList(q) {
  return Array.isArray(q?.options) ? q.options : [];
}

/** Chỉ số đáp án đúng (0..n-1), luôn hợp lệ với số lượng phương án. */
export function quizCorrectOptionIndex(q) {
  const opts = quizOptionList(q);
  if (opts.length === 0) return -1;
  const c = Number(q?.correctIndex);
  if (!Number.isFinite(c)) return 0;
  return Math.min(Math.max(0, Math.floor(c)), opts.length - 1);
}

/**
 * @param {Record<string, string>} meta
 * @param {number} qIndex
 * @param {any} question
 */
export function buildAiDraftQuiz(meta, qIndex, question) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const opts = (question.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
  return (
    `[Sửa đề quiz — nhờ AI]\n` +
    `Ngữ cảnh — Full set trộn | Chủ đề: ${topic}; Số câu quiz trong bộ: ${count}; Ghi chú: ${notes}\n` +
    `Câu hiện tại (mục ${qIndex + 1} trong phiên): ${question.text}\n` +
    `${opts}\n\n` +
    `Hãy đề xuất phiên bản câu hỏi và phương án tốt hơn (giữ định dạng trắc nghiệm 4 lựa chọn), kèm đáp án đúng và gợi ý ngắn.`
  );
}

/**
 * @param {number} totalSteps
 * @param {any} initial
 */
export function initMixedQuizTracking(totalSteps, initial) {
  /** @type {(number | null)[]} */
  const quizSelectedByStep = Array.from({ length: totalSteps }, (_, i) => {
    const arr = Array.isArray(initial?.quizSelectedByStep) ? initial.quizSelectedByStep : [];
    const v = arr[i];
    return Number.isFinite(Number(v)) ? Math.floor(Number(v)) : null;
  });
  /** @type {boolean[]} */
  const quizRevealedByStep = Array.from({ length: totalSteps }, (_, i) => {
    const arr = Array.isArray(initial?.quizRevealedByStep) ? initial.quizRevealedByStep : [];
    return Boolean(arr[i]);
  });
  /** @type {boolean[]} */
  const quizCountedByStep = Array.from({ length: totalSteps }, (_, i) => {
    const arr = Array.isArray(initial?.quizCountedByStep) ? initial.quizCountedByStep : [];
    return Boolean(arr[i]);
  });
  /** @type {boolean[]} */
  const quizCorrectByStep = Array.from({ length: totalSteps }, (_, i) => {
    const arr = Array.isArray(initial?.quizCorrectByStep) ? initial.quizCorrectByStep : [];
    return Boolean(arr[i]);
  });
  return { quizSelectedByStep, quizRevealedByStep, quizCountedByStep, quizCorrectByStep };
}

/**
 * @param {{ kind: "slide"|"quiz"|"flash", data: any }[]} steps
 */
export function buildQuizStepOrder(steps) {
  /** @type {number[]} */
  const quizStepIndexes = [];
  /** @type {Record<number, number>} */
  const quizOrderByStep = {};
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i]?.kind !== "quiz") continue;
    quizOrderByStep[i] = quizStepIndexes.length + 1;
    quizStepIndexes.push(i);
  }
  return { quizStepIndexes, quizOrderByStep };
}

/**
 * @param {boolean[]} quizCountedByStep
 * @param {boolean[]} quizCorrectByStep
 */
export function recomputeMixedQuizScore(quizCountedByStep, quizCorrectByStep) {
  let correct = 0;
  let wrong = 0;
  for (let i = 0; i < quizCountedByStep.length; i += 1) {
    if (!quizCountedByStep[i]) continue;
    if (quizCorrectByStep[i]) correct += 1;
    else wrong += 1;
  }
  return { correct, wrong };
}

/**
 * @param {any} question
 * @param {number | null} pickedIndex
 */
export function buildMixedWrongExplanation(question, pickedIndex) {
  const picked = Number.isFinite(Number(pickedIndex)) ? Number(pickedIndex) : -1;
  const pickedText = picked >= 0 ? question?.options?.[picked] : "";
  const correctText = question?.options?.[question?.correctIndex] || "";
  const base = question?.hint ? String(question.hint) : "Cần bám sát nghĩa trọng tâm và loại trừ đáp án nhiễu.";
  return `Bạn chọn "${pickedText || "không chọn"}" nên chưa đúng. Đáp án đúng là "${correctText}". ${base}`;
}

