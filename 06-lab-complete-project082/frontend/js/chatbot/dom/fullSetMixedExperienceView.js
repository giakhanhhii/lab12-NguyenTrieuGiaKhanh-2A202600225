import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareQuizSessionData, prepareSlideSessionData, prepareFlashSessionData, shuffleInPlace } from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { buildQuizStepOrder, buildAiDraftQuiz, initMixedQuizTracking, recomputeMixedQuizScore, quizCorrectOptionIndex, quizOptionList } from "../services/fullSetMixedService.js";
import { hookFlashSpeechVoicesOnce } from "../services/speechService.js";
import { applyQuizRevealStyles, createStepBadge, renderFlashStep, renderQuizStep, renderSlideStep } from "./fullSetMixedStepView.js";
import { renderFullSetMixedReviewView } from "./fullSetMixedReviewView.js";

/**
 * @typedef {{ topic: string, level: string, slides: string, quiz: string, flash: string, extra?: string }} FullSetMixedSpec
 */

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {{ title?: string, spec: FullSetMixedSpec }} bundle
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "fullset"|"slide"|"quiz"|"flash", opts?: { preset?: "same"|"other" }) => void | Promise<void> }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountFullSetMixedExperience(layerView, bundle, deps, opts = {}) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const root = layerView.body;
  root.innerHTML = "";
  const spec = bundle.spec || {};
  const topic = spec.topic || "—";
  const notesLine = spec.extra ? ` | Yêu cầu thêm: ${spec.extra}` : "";
  const slideMeta = { topic, count: spec.slides, notes: "Full set (demo mock)" };
  const quizMeta = { topic, count: spec.quiz, notes: "Full set (demo mock)" };
  const flashMeta = { source: topic, count: spec.flash, extra: "Full set (demo mock)" };
  const [rawSlide, rawQuiz, rawFlash] = await Promise.all([fetchMockResource("slide"), fetchMockResource("quiz"), fetchMockResource("flashcard")]);
  const slideData = prepareSlideSessionData(rawSlide, slideMeta);
  const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
  const flashData = prepareFlashSessionData(rawFlash, flashMeta);
  const slides = Array.isArray(slideData.slides) ? slideData.slides : [];
  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  const cards = Array.isArray(flashData.cards) ? flashData.cards : [];
  /** @type {{ kind: "slide"|"quiz"|"flash", data: any }[]} */
  const steps = [
    ...slides.map((data) => ({ kind: /** @type {"slide"} */ ("slide"), data })),
    ...questions.map((data) => ({ kind: /** @type {"quiz"} */ ("quiz"), data })),
    ...cards.map((data) => ({ kind: /** @type {"flash"} */ ("flash"), data })),
  ];
  shuffleInPlace(steps);
  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let reviewMode = Boolean(initial?.reviewMode);
  /** @type {"all"|"wrong"} */
  let reviewFilter = initial?.reviewFilter === "wrong" ? "wrong" : "all";
  /** @type {number | null} */
  let quizSelected = null;
  let quizRevealed = false;
  const { quizSelectedByStep, quizRevealedByStep, quizCountedByStep, quizCorrectByStep } = initMixedQuizTracking(steps.length, initial);
  const { quizStepIndexes, quizOrderByStep } = buildQuizStepOrder(steps);
  index = Math.min(Math.max(0, index), Math.max(0, steps.length - 1));
  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";
  const titleText = quizData.title || slideData.title || bundle.title || "Full set — ôn tập trộn";
  const onAi = () => {
    const step = steps[index];
    if (!step || step.kind !== "quiz" || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(quizMeta, index, step.data));
  };
  shell.appendChild(createExperienceTopBar({ title: titleText, onAiEdit: deps?.onAiEdit ? onAi : undefined }));
  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  const sum = steps.length;
  summary.textContent = `Full set — ${topic} | Trình độ: ${spec.level || "—"} | Slide ${spec.slides} + Quiz ${spec.quiz} + Flash ${spec.flash} = ${sum} mục (trộn lẫn)${notesLine}`;
  const total = Math.max(1, steps.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  const stage = document.createElement("div");
  stage.className = "exp-stage";
  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  function refreshScore() {
    const score = recomputeMixedQuizScore(quizCountedByStep, quizCorrectByStep);
    correct = score.correct;
    wrong = score.wrong;
  }
  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "fullset",
      title: titleText,
      spec: { ...spec },
      total: steps.length,
      index,
      quizSelectedByStep: [...quizSelectedByStep],
      quizRevealedByStep: [...quizRevealedByStep],
      quizCountedByStep: [...quizCountedByStep],
      quizCorrectByStep: [...quizCorrectByStep],
      reviewMode,
      reviewFilter,
      correct,
      wrong,
    });
  }
  function exitReviewToLastStep() {
    reviewMode = false;
    index = Math.max(0, steps.length - 1);
    footer.hidden = false;
    renderStep();
  }
  function renderReview() {
    footer.hidden = true;
    refreshScore();
    progress.paint({ total, index: Math.max(0, steps.length - 1), correct, wrong });
    renderFullSetMixedReviewView({
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
      onBackToStep: exitReviewToLastStep,
      onCreateOther: () => deps?.onContinueCreate?.("fullset", { preset: "other" }),
      onContinueCreate: () => deps?.onContinueCreate?.("fullset", { preset: "same" }),
      onFilterChange: (filter) => {
        reviewFilter = filter;
        renderReview();
      },
    });
    emitState();
  }
  function renderStep() {
    if (reviewMode) {
      renderReview();
      return;
    }
    footer.hidden = false;
    const step = steps[index];
    stage.innerHTML = "";
    backBtn.textContent = "Quay lại";
    backBtn.disabled = index <= 0;
    quizSelected = quizSelectedByStep[index] ?? null;
    quizRevealed = !!quizRevealedByStep[index];
    refreshScore();
    if (!step) {
      stage.innerHTML = `<p class="exp-empty">Không có học liệu trong bộ Full set.</p>`;
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      progress.paint({ total, index: Math.max(0, index), correct, wrong });
      return;
    }
    stage.appendChild(createStepBadge(step.kind));
    if (step.kind === "slide") {
      renderSlideStep(stage, step.data);
      nextBtn.disabled = false;
    } else if (step.kind === "flash") {
      renderFlashStep(stage, step.data);
      nextBtn.disabled = false;
    } else {
      const quizUi = renderQuizStep(stage, {
        index,
        question: step.data,
        selected: quizSelected,
        revealed: !!quizRevealedByStep[index],
        onPick: (pickedIndex) => {
          quizSelected = pickedIndex;
          quizSelectedByStep[index] = pickedIndex;
          nextBtn.disabled = false;
          emitState();
        },
      });
      nextBtn.disabled = !quizUi.canProceed;
    }
    progress.paint({ total, index, correct, wrong });
    nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    emitState();
  }
  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      void Promise.resolve(deps?.onContinueCreate?.("fullset"));
      return;
    }
    const step = steps[index];
    if (!step) return;
    if (step.kind === "quiz") {
      const q = step.data;
      const opts = quizOptionList(q);
      const correctIdx = quizCorrectOptionIndex(q);
      if (opts.length === 0) {
        if (index >= total - 1) {
          nextBtn.disabled = true;
          return;
        }
        index += 1;
        renderStep();
        return;
      }
      if (!quizRevealed) {
        if (quizSelected == null || !Number.isFinite(Number(quizSelected))) return;
        const picked = Number(quizSelected);
        const ok = picked === correctIdx;
        quizRevealed = true;
        quizSelectedByStep[index] = picked;
        quizRevealedByStep[index] = true;
        if (!quizCountedByStep[index]) {
          quizCountedByStep[index] = true;
          quizCorrectByStep[index] = ok;
        }
        refreshScore();
        progress.paint({ total, index, correct, wrong });
        applyQuizRevealStyles(stage, q, picked);
        nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
        nextBtn.disabled = false;
        emitState();
        return;
      }
      if (index >= total - 1) {
        if (quizStepIndexes.length === 0) {
          deps?.onContinueCreate?.("fullset");
          return;
        }
        reviewMode = true;
        reviewFilter = "all";
        renderReview();
        return;
      }
      index += 1;
      renderStep();
      return;
    }
    if (index >= total - 1) {
      if (quizStepIndexes.length === 0) {
        deps?.onContinueCreate?.("fullset");
        return;
      }
      reviewMode = true;
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderStep();
  });
  backBtn.addEventListener("click", () => {
    if (reviewMode) {
      exitReviewToLastStep();
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderStep();
  });
  shell.appendChild(summary);
  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}
