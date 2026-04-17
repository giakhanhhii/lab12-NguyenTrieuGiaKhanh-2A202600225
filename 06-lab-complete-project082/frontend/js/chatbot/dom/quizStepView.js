import { quizStemToSafeHtml } from "../services/quizService.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * @param {HTMLButtonElement[]} buttons
 * @param {number | null} selected
 * @param {number} correctIndex
 */
function applyGradedStyles(buttons, selected, correctIndex) {
  buttons.forEach((btn, j) => {
    if (j === correctIndex) btn.classList.add("correct");
    if (j === selected && j !== correctIndex) btn.classList.add("wrong");
    btn.disabled = true;
  });
}

/**
 * @param {{
 *  stage: HTMLElement,
 *  question: any,
 *  index: number,
 *  selected: number | null,
 *  graded: boolean,
 *  onSelect: (selectedIndex: number) => void,
 * }} params
 */
export function renderQuizStepView(params) {
  const { stage, question, index, selected, graded, onSelect } = params;
  stage.innerHTML = "";
  if (!question) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    empty.textContent = "Không có câu hỏi trong bộ dữ liệu mock.";
    stage.appendChild(empty);
    return { hasQuestion: false };
  }

  const num = document.createElement("div");
  num.className = "exp-q-number";
  num.textContent = `${index + 1}.`;

  const text = document.createElement("p");
  text.className = "exp-q-text";
  text.innerHTML = quizStemToSafeHtml(question.text || "");

  const optsWrap = document.createElement("div");
  optsWrap.className = "exp-option-grid";
  const buttons = [];
  (question.options || []).forEach((opt, j) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "exp-opt-btn";
    b.textContent = `${OPTION_LETTERS[j] || j}. ${opt}`;
    b.addEventListener("click", () => {
      if (graded) return;
      onSelect(j);
      optsWrap.querySelectorAll(".exp-opt-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
    if (selected === j) b.classList.add("selected");
    optsWrap.appendChild(b);
    buttons.push(b);
  });

  const hintToggle = document.createElement("button");
  hintToggle.type = "button";
  hintToggle.className = "exp-hint-toggle";
  hintToggle.innerHTML = `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;

  const hintPanel = document.createElement("div");
  hintPanel.className = "exp-hint-panel";
  hintPanel.hidden = true;
  hintPanel.textContent = question.hint || "(Chưa có gợi ý.)";

  let hintOpen = false;
  hintToggle.addEventListener("click", () => {
    hintOpen = !hintOpen;
    hintPanel.hidden = !hintOpen;
    hintToggle.innerHTML = hintOpen
      ? `Ẩn gợi ý <span class="exp-chevron exp-chevron-up" aria-hidden="true">▾</span>`
      : `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
  });

  stage.appendChild(num);
  stage.appendChild(text);
  stage.appendChild(optsWrap);
  stage.appendChild(hintToggle);
  stage.appendChild(hintPanel);

  if (graded) applyGradedStyles(buttons, selected, question.correctIndex);
  return {
    hasQuestion: true,
    optionButtons: buttons,
    applyGrading(currentSelected) {
      applyGradedStyles(buttons, currentSelected, question.correctIndex);
    },
  };
}
