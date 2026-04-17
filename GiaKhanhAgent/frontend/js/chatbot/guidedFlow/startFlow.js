import { MSG_START_SOURCE, getSourceActions } from "./shared.js";

/** @param {string | null} flow */
export function computeStartFlow(flow) {
  const normalizedFlow = flow === "image" ? "flashcard" : flow;

  if (normalizedFlow === "fullset") return buildStart("fullset");
  if (normalizedFlow === "slide") return buildStart("slide");
  if (normalizedFlow === "quiz") return buildStart("quiz");
  if (normalizedFlow === "flashcard") return buildStart("flash");

  return { guided: null, effects: [] };
}

/** @param {"fullset"|"slide"|"quiz"|"flash"} kind */
function buildStart(kind) {
  return {
    guided: { kind, step: "await_source", data: {} },
    effects: [{ type: "pushBot", text: MSG_START_SOURCE, actions: getSourceActions(kind) }],
  };
}

