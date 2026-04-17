import { buildMixedWrongExplanation, quizStemToSafeHtml } from "../services/fullSetMixedService.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * @param {{
 *  stage: HTMLElement,
 *  steps: { kind: "slide"|"quiz"|"flash", data: any }[],
 *  quizStepIndexes: number[],
 *  quizOrderByStep: Record<number, number>,
 *  quizSelectedByStep: (number | null)[],
 *  quizCountedByStep: boolean[],
 *  quizCorrectByStep: boolean[],
 *  reviewFilter: "all" | "wrong",
 *  correct: number,
 *  wrong: number,
 *  onBackToStep: () => void,
 *  onCreateOther: () => void | Promise<void>,
 *  onContinueCreate: () => void | Promise<void>,
 *  onFilterChange: (filter: "all"|"wrong") => void,
 * }} params
 */
export function renderFullSetMixedReviewView(params) {
  const {
    stage,
    steps,
    quizStepIndexes,
    quizOrderByStep,
    quizSelectedByStep,
    quizCountedByStep,
    quizCorrectByStep,
    reviewFilter,
    correct,
    wrong,
    onBackToStep,
    onCreateOther,
    onContinueCreate,
    onFilterChange,
  } = params;
  stage.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "quiz-review-wrap";
  const scoreRow = document.createElement("div");
  scoreRow.className = "quiz-review-score-row";
  const scoreMain = document.createElement("div");
  scoreMain.className = "quiz-review-score-main";
  const scoreCard = document.createElement("div");
  scoreCard.className = "quiz-review-score";
  scoreCard.innerHTML = `
      <h3>Kết quả bài quiz</h3>
      <p>Bạn làm đúng <strong>${correct}</strong>/<strong>${quizStepIndexes.length}</strong> câu, sai <strong>${wrong}</strong> câu.</p>
    `;
  scoreMain.appendChild(scoreCard);

  const actions = document.createElement("div");
  actions.className = "quiz-review-actions";
  const backInline = document.createElement("button");
  backInline.type = "button";
  backInline.className = "continue-create-btn quiz-review-action-back";
  backInline.textContent = "Quay lại thẻ";
  backInline.addEventListener("click", onBackToStep);

  const otherInline = document.createElement("button");
  otherInline.type = "button";
  otherInline.className = "continue-create-btn continue-create-btn-secondary";
  otherInline.textContent = "Tạo thẻ khác";
  otherInline.addEventListener("click", () => {
    void Promise.resolve(onCreateOther());
  });

  const sameInline = document.createElement("button");
  sameInline.type = "button";
  sameInline.className = "continue-create-btn continue-create-btn-primary";
  sameInline.textContent = "Tiếp tục tạo";
  sameInline.addEventListener("click", () => {
    void Promise.resolve(onContinueCreate());
  });
  actions.appendChild(backInline);
  actions.appendChild(otherInline);
  actions.appendChild(sameInline);
  scoreRow.appendChild(scoreMain);
  scoreRow.appendChild(actions);
  wrap.appendChild(scoreRow);

  const filterRow = document.createElement("div");
  filterRow.className = "quiz-review-filters";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `quiz-review-filter-btn${reviewFilter === "all" ? " active" : ""}`;
  allBtn.textContent = "Xem toàn bộ câu";
  allBtn.addEventListener("click", () => onFilterChange("all"));
  const wrongBtn = document.createElement("button");
  wrongBtn.type = "button";
  wrongBtn.className = `quiz-review-filter-btn${reviewFilter === "wrong" ? " active" : ""}`;
  wrongBtn.textContent = "Xem các câu sai";
  wrongBtn.addEventListener("click", () => onFilterChange("wrong"));
  filterRow.appendChild(allBtn);
  filterRow.appendChild(wrongBtn);
  wrap.appendChild(filterRow);

  const list = document.createElement("div");
  list.className = "quiz-review-list";
  const visibleStepIndexes = [];
  for (let i = 0; i < quizStepIndexes.length; i += 1) {
    const stepIndex = quizStepIndexes[i];
    if (reviewFilter === "wrong" && quizCorrectByStep[stepIndex]) continue;
    visibleStepIndexes.push(stepIndex);
  }

  if (!visibleStepIndexes.length) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    empty.textContent = reviewFilter === "wrong" ? "Tuyệt vời! Bạn không có câu sai." : "Chưa có dữ liệu để hiển thị.";
    list.appendChild(empty);
  } else {
    visibleStepIndexes.forEach((stepIndex) => {
      const q = steps[stepIndex]?.data || {};
      const picked = quizSelectedByStep[stepIndex];
      const isCounted = !!quizCountedByStep[stepIndex];
      const isCorrect = isCounted && !!quizCorrectByStep[stepIndex];
      const isWrong = isCounted && !quizCorrectByStep[stepIndex];

      const card = document.createElement("div");
      card.className = "quiz-review-card";
      const title = document.createElement("div");
      title.className = "quiz-review-question";
      title.innerHTML = `<strong>Câu ${quizOrderByStep[stepIndex]}.</strong> ${quizStemToSafeHtml(q.text || "")}`;
      card.appendChild(title);

      const options = document.createElement("div");
      options.className = "quiz-review-options";
      (q.options || []).forEach((opt, j) => {
        const line = document.createElement("div");
        let cls = "quiz-review-option";
        if (j === q.correctIndex) cls += " correct";
        if (j === picked && j !== q.correctIndex) cls += " wrong";
        line.className = cls;
        line.textContent = `${OPTION_LETTERS[j] || j}. ${opt}`;
        options.appendChild(line);
      });
      card.appendChild(options);

      const result = document.createElement("div");
      result.className = `quiz-review-result ${isCorrect ? "ok" : isWrong ? "bad" : ""}`.trim();
      result.textContent = isCorrect
        ? "Bạn làm đúng câu này."
        : isWrong
          ? "Bạn làm sai câu này."
          : "Câu này chưa được chấm điểm.";
      card.appendChild(result);

      if (isWrong) {
        const exp = document.createElement("div");
        exp.className = "quiz-review-explain";
        exp.textContent = buildMixedWrongExplanation(q, picked);
        card.appendChild(exp);
      }
      list.appendChild(card);
    });
  }

  wrap.appendChild(list);
  stage.appendChild(wrap);
}
