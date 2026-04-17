import { getRestartAwaitSourceEffects } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} cardType
 */
export function computeFlowCardBack(guided, cardType) {
  void cardType;
  if (!guided) return { handled: false, guided, effects: [] };

  const { kind, step } = guided;
  if (step === "await_topic_form" || step === "await_pdf_confirm" || step === "await_pdf_meta" || step === "await_pdf_file") {
    return {
      handled: true,
      guided: { kind, step: "await_source", data: {} },
      effects: [{ type: "pushUser", text: "Quay lại" }, ...getRestartAwaitSourceEffects(kind)],
    };
  }

  return { handled: false, guided, effects: [] };
}

