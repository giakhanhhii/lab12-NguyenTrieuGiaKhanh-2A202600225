import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareQuizSessionData } from "../services/sessionContentPrep.js";
import { buildAiDraftQuiz, recomputeScore } from "../services/quizService.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { renderQuizStepView } from "./quizStepView.js";
import { renderQuizReviewView } from "./quizReviewView.js";

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountQuizExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  const root = layerView.body;
  const raw = await fetchMockResource("quiz");
  const data = prepareQuizSessionData(raw, meta);
  const titleText = data.title || "Ôn tập trắc nghiệm";
  const questions = Array.isArray(data.questions) ? data.questions : [];

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let selected = null;
  let reviewMode = false;
  /** @type {"all"|"wrong"} */
  let reviewFilter = "all";

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz";

  const onAiForQuestion = () => {
    const q = questions[index];
    if (!q || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(meta, index, q));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAiForQuestion : undefined,
    }),
  );

  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  summary.textContent = `Đã ghi nhận — Chủ đề: ${meta.topic || "—"} | Số câu (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.notes || "—"}`;
  shell.appendChild(summary);

  const total = Math.max(1, questions.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);
  /** @type {(number|null)[]} */
  const selectedByIndex = Array.from({ length: questions.length }, (_, i) => {
    const arr = Array.isArray(initial?.selectedByIndex) ? initial.selectedByIndex : [];
    const v = arr[i];
    return Number.isFinite(Number(v)) ? Math.floor(Number(v)) : null;
  });
  /** @type {boolean[]} */
  const gradedByIndex = Array.from({ length: questions.length }, (_, i) => {
    const arr = Array.isArray(initial?.gradedByIndex) ? initial.gradedByIndex : [];
    return Boolean(arr[i]);
  });
  /** @type {{ hasQuestion: boolean, applyGrading?: (selectedIndex: number | null) => void } | null} */
  let activeStepView = null;
  index = Math.min(Math.max(0, index), Math.max(0, questions.length - 1));

  function refreshScore() {
    const score = recomputeScore(questions, selectedByIndex, gradedByIndex);
    correct = score.correct;
    wrong = score.wrong;
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "quiz",
      meta: { ...meta },
      title: titleText,
      total: questions.length,
      index,
      selectedByIndex: [...selectedByIndex],
      gradedByIndex: [...gradedByIndex],
      correct,
      wrong,
    });
  }

  const stage = document.createElement("div");
  stage.className = "exp-stage";
  shell.appendChild(stage);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function renderQuestion() {
    reviewMode = false;
    footer.hidden = false;
    const q = questions[index];
    selected = index < selectedByIndex.length ? selectedByIndex[index] : null;
    activeStepView = renderQuizStepView({
      stage,
      question: q,
      index,
      selected,
      graded: gradedByIndex[index],
      onSelect: (pickedIndex) => {
        selected = pickedIndex;
        selectedByIndex[index] = pickedIndex;
        nextBtn.disabled = false;
        emitState();
      },
    });

    backBtn.disabled = index <= 0;
    nextBtn.disabled = !gradedByIndex[index] && selected === null;
    backBtn.textContent = "Quay lại";

    if (!activeStepView?.hasQuestion) {
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      refreshScore();
      progress.paint({ total, index, correct, wrong });
      emitState();
      return;
    }
    refreshScore();
    progress.paint({ total, index, correct, wrong });

    if (!gradedByIndex[index]) nextBtn.textContent = "Tiếp theo";
    else {
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Tiếp tục tạo" : "Tiếp theo";
    }
    emitState();
  }

  function renderReview() {
    reviewMode = true;
    footer.hidden = true;
    activeStepView = null;
    refreshScore();
    progress.paint({ total, index: Math.max(0, questions.length - 1), correct, wrong });
    renderQuizReviewView({
      stage,
      questions,
      selectedByIndex,
      gradedByIndex,
      reviewFilter,
      correct,
      wrong,
      onFilterChange: (filter) => {
        reviewFilter = filter;
        renderReview();
      },
      onBackToCard: () => {
        reviewMode = false;
        index = Math.max(0, questions.length - 1);
        renderQuestion();
      },
      onCreateOther: () => deps?.onContinueCreate?.("quiz", { preset: "other" }),
      onContinueCreate: () => deps?.onContinueCreate?.("quiz"),
    });

    backBtn.textContent = "Quay lại thẻ";
    backBtn.disabled = false;
    nextBtn.textContent = "Tiếp tục tạo";
    nextBtn.disabled = false;
    emitState();
  }

  backBtn.addEventListener("click", () => {
    if (reviewMode) {
      reviewMode = false;
      index = Math.max(0, questions.length - 1);
      backBtn.textContent = "Quay lại";
      renderQuestion();
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderQuestion();
  });

  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      deps?.onContinueCreate?.("quiz");
      return;
    }
    const q = questions[index];
    if (!q) return;

    if (!gradedByIndex[index]) {
      if (selected === null) return;
      gradedByIndex[index] = true;
      selectedByIndex[index] = selected;
      refreshScore();
      progress.paint({ total, index, correct, wrong });
      activeStepView?.applyGrading?.(selected);
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Tiếp tục tạo" : "Tiếp theo";
      nextBtn.disabled = false;
      emitState();
      return;
    }

    if (index >= questions.length - 1) {
      reviewMode = true;
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderQuestion();
  });

  root.appendChild(shell);
  renderQuestion();
}
