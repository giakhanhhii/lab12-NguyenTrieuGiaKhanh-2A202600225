import { getApiOrigin } from "../config.js";
import { EMBEDDED_QUIZ, EMBEDDED_FLASHCARD, EMBEDDED_SLIDE } from "./embeddedMockBundles.js";

/** @typedef {'quiz' | 'flashcard' | 'slide'} MockResource */

/** Dùng khi không gọi được API (file:// hoặc server chưa bật) — đồng bộ pool với backend/mock. */
export const FALLBACK_QUIZ = EMBEDDED_QUIZ;
export const FALLBACK_FLASHCARD = EMBEDDED_FLASHCARD;
export const FALLBACK_SLIDE = EMBEDDED_SLIDE;

/**
 * @param {MockResource} name
 * @returns {Promise<any>}
 */
export async function fetchMockResource(name) {
  try {
    const url = `${getApiOrigin()}/api/mock/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    if (name === "quiz") return { ...FALLBACK_QUIZ };
    if (name === "flashcard") return { ...FALLBACK_FLASHCARD };
    if (name === "slide") return { ...FALLBACK_SLIDE };
    throw new Error(`Unknown mock: ${name}`);
  }
}
