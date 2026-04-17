import { computeFlowCardBack } from "./guidedFlow/back.js";
import { computeFlowCardSubmit } from "./guidedFlow/cardSubmit.js";
import { computePickAction } from "./guidedFlow/pickAction.js";
import { computeStartFlow } from "./guidedFlow/startFlow.js";
import {
  MSG_START_SOURCE,
  PDF_SOURCE_ACTION_VALUES,
  getRestartAwaitSourceEffects,
} from "./guidedFlow/shared.js";

export { MSG_START_SOURCE, PDF_SOURCE_ACTION_VALUES, getRestartAwaitSourceEffects };
export { computePickAction, computeFlowCardSubmit, computeStartFlow, computeFlowCardBack };

/**
 * @param {any} guided
 * @param {string} text
 */
export function computeGuidedTextSubmit(guided, text) {
  void text;
  if (!guided) return { handled: false, guided: null, effects: [] };
  return { handled: false, guided, effects: [] };
}

