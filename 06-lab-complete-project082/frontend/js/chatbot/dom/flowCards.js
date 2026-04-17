import { takePendingPdfFile } from "../pdfPrefillStore.js";
import { createFlashcardFormCard } from "./cards/flashCard.js";
import { createFullsetPdfCard, createFullsetTopicCard } from "./cards/fullsetCards.js";
import { createPickPdfGateCard, createFlashPdfMetaCard, createQuizPdfMetaCard, createSlidePdfMetaCard } from "./cards/pdfCards.js";
import { createQuizFormCard } from "./cards/quizCard.js";
import { createSlideFormCard } from "./cards/slideCard.js";
import { el } from "./cards/flowCardShared.js";

export {
  createFullsetTopicCard,
  createFullsetPdfCard,
  createPickPdfGateCard,
  createSlideFormCard,
  createQuizFormCard,
  createFlashcardFormCard,
};

/**
 * @param {string} cardType
 * @param {{ onSubmit: (p: Record<string, string>) => void }} deps
 */
export function createFlowCard(cardType, deps) {
  switch (cardType) {
    case "fullset_topic":
      return createFullsetTopicCard(deps);
    case "fullset_pdf": {
      const pendingPdf = takePendingPdfFile();
      return createFullsetPdfCard(pendingPdf ? { ...deps, initialFile: pendingPdf } : deps);
    }
    case "pick_pdf_gate":
      return createPickPdfGateCard(deps);
    case "slide_pdf_meta":
      return createSlidePdfMetaCard(deps.onSubmit);
    case "quiz_pdf_meta":
      return createQuizPdfMetaCard(deps.onSubmit);
    case "flash_pdf_meta":
      return createFlashPdfMetaCard(deps.onSubmit);
    case "slide_form":
      return createSlideFormCard(deps);
    case "quiz_form":
      return createQuizFormCard(deps);
    case "flash_form":
      return createFlashcardFormCard(deps);
    default:
      return el("div", "flow-card", "");
  }
}
