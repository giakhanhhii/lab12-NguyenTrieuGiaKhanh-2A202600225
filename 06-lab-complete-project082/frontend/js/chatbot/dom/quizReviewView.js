import { buildWrongExplanation, quizStemToSafeHtml } from "../services/quizService.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * @param {{
 *  stage: HTMLElement,
 *  questions: any[],
 *  selectedByIndex: (number | null)[],
 *  gradedByIndex: boolean[],
 *  reviewFilter: "all" | "wrong",
 *  correct: number,
 *  wrong: number,
 *  onFilterChange: (filter: "all" | "wrong") => void,
 *  onBackToCard: () => void,
 *  onCreateOther: () => void,
 *  onContinueCreate: () => void,
 * }} params
 */
export function renderQuizReviewView(params) {
  const {
    stage,
    questions,
    selectedByIndex,
    gradedByIndex,
    reviewFilter,
    correct,
    wrong,
    onFilterChange,
    onBackToCard,
    onCreateOther,
    onContinueCreate,
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
      <p>Bạn làm đúng <strong>${correct}</strong>/<strong>${questions.length}</strong> câu, sai <strong>${wrong}</strong> câu.</p>
    `;
  scoreMain.appendChild(scoreCard);

  const actions = document.createElement("div");
  actions.className = "quiz-review-actions";
  const backBtnInline = document.createElement("button");
  backBtnInline.type = "button";
  backBtnInline.className = "continue-create-btn quiz-review-action-back";
  backBtnInline.textContent = "Quay lại thẻ";
  backBtnInline.addEventListener("click", onBackToCard);

  const otherBtnInline = document.createElement("button");
  otherBtnInline.type = "button";
  otherBtnInline.className = "continue-create-btn continue-create-btn-secondary";
  otherBtnInline.textContent = "Tạo thẻ khác";
  otherBtnInline.addEventListener("click", onCreateOther);

  const nextBtnInline = document.createElement("button");
  nextBtnInline.type = "button";
  nextBtnInline.className = "continue-create-btn continue-create-btn-primary";
  nextBtnInline.textContent = "Tiếp tục tạo";
  nextBtnInline.addEventListener("click", onContinueCreate);

  actions.appendChild(backBtnInline);
  actions.appendChild(otherBtnInline);
  actions.appendChild(nextBtnInline);
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
  const visibleIndexes = [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const picked = selectedByIndex[i];
    const isWrong = gradedByIndex[i] && picked !== null && picked !== q.correctIndex;
    if (reviewFilter === "wrong" && !isWrong) continue;
    visibleIndexes.push(i);
  }

  if (!visibleIndexes.length) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    empty.textContent = reviewFilter === "wrong" ? "Tuyệt vời! Bạn không có câu sai." : "Chưa có dữ liệu để hiển thị.";
    list.appendChild(empty);
  } else {
    visibleIndexes.forEach((i) => {
      const q = questions[i];
      const picked = selectedByIndex[i];
      const isCorrect = gradedByIndex[i] && picked !== null && picked === q.correctIndex;
      const isWrong = gradedByIndex[i] && picked !== null && picked !== q.correctIndex;

      const card = document.createElement("div");
      card.className = "quiz-review-card";
      const title = document.createElement("div");
      title.className = "quiz-review-question";
      title.innerHTML = `<strong>Câu ${i + 1}.</strong> ${quizStemToSafeHtml(q.text || "")}`;
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
      result.className = `quiz-review-result ${isCorrect ? "ok" : "bad"}`;
      result.textContent = isCorrect ? "Bạn làm đúng câu này." : "Bạn làm sai câu này.";
      card.appendChild(result);

      if (isWrong) {
        const exp = document.createElement("div");
        exp.className = "quiz-review-explain";
        exp.textContent = buildWrongExplanation(q, picked);
        card.appendChild(exp);
      }

      list.appendChild(card);
    });
  }

  wrap.appendChild(list);
  stage.appendChild(wrap);
}
