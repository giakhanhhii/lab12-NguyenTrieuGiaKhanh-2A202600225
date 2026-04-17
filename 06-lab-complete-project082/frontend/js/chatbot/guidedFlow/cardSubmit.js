import { computePdfGateCardSubmit } from "./cardSubmitCommon.js";
import { computeFlashCardSubmit } from "./cardSubmitFlash.js";
import { computeFullsetCardSubmit } from "./cardSubmitFullset.js";
import { computeQuizCardSubmit } from "./cardSubmitQuiz.js";
import { computeSlideCardSubmit } from "./cardSubmitSlide.js";

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFlowCardSubmit(guided, cardType, payload) {
  if (!guided) return { handled: false, guided, effects: [] };

  const handlers = [
    computeFullsetCardSubmit,
    computePdfGateCardSubmit,
    computeSlideCardSubmit,
    computeQuizCardSubmit,
    computeFlashCardSubmit,
  ];

  for (const handler of handlers) {
    const result = handler(guided, cardType, payload);
    if (result) return result;
  }

  return { handled: false, guided, effects: [] };
}

