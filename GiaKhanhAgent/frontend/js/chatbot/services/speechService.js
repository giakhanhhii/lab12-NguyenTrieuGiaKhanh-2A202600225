export const FLASH_SOUND_SVG = `<svg class="flash-sound-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a8 8 0 010 12.72" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

let flashSpeechVoicesHooked = false;
let flashSpeakGeneration = 0;
let flashVoicesCache = null; // SpeechSynthesisVoice[] | null
const flashVoiceByLangCache = new Map(); // normalizedLang -> SpeechSynthesisVoice | null
let flashSpeechWarmupHooked = false;
let flashSpeechPrimed = false;

function primeSpeechSynthesisOnce() {
  if (flashSpeechPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  const syn = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance("\u00A0");
  u.volume = 0;
  u.rate = 1;
  u.pitch = 1;
  u.lang = "en-US";

  const markPrimed = () => {
    flashSpeechPrimed = true;
  };
  u.onstart = markPrimed;
  u.onend = markPrimed;
  u.onerror = markPrimed;

  try {
    syn.speak(u);
    // Do not force-cancel with a 0ms timeout: some engines start async,
    // and an eager cancel can race or cancel a user-triggered utterance.
    // Any stale queued warmup is already cleared by speakText().
  } catch (_) {
    // Ignore warmup errors; normal speak flow still works.
  }
}

function hookFlashSpeechWarmupGestureOnce() {
  if (flashSpeechWarmupHooked || typeof window === "undefined") return;
  flashSpeechWarmupHooked = true;

  const trigger = () => {
    primeSpeechSynthesisOnce();
    window.removeEventListener("pointerdown", trigger, true);
    window.removeEventListener("keydown", trigger, true);
    window.removeEventListener("touchstart", trigger, true);
  };

  window.addEventListener("pointerdown", trigger, true);
  window.addEventListener("keydown", trigger, true);
  window.addEventListener("touchstart", trigger, true);
}

export function hookFlashSpeechVoicesOnce() {
  if (typeof window === "undefined" || !window.speechSynthesis || flashSpeechVoicesHooked) return;
  flashSpeechVoicesHooked = true;
  const syn = window.speechSynthesis;

  const refreshVoices = () => {
    flashVoicesCache = syn.getVoices();
    flashVoiceByLangCache.clear();
  };

  // Prime cache immediately; voices may still fill in asynchronously.
  refreshVoices();
  syn.addEventListener("voiceschanged", refreshVoices);
  hookFlashSpeechWarmupGestureOnce();
}

/**
 * @param {string} targetLang 
 * @returns {SpeechSynthesisVoice | null}
 */
function pickBestSpeechVoice(targetLang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const tl = String(targetLang || "en-US").toLowerCase().replace("_", "-");
  const cacheKey = tl;
  if (flashVoiceByLangCache.has(cacheKey)) return flashVoiceByLangCache.get(cacheKey) || null;

  // Use cached voices to avoid re-running voice selection on every click.
  let voices = flashVoicesCache;
  if (!voices || !voices.length) {
    voices = window.speechSynthesis.getVoices();
    if (voices.length) flashVoicesCache = voices;
  }
  if (!voices || !voices.length) {
    flashVoiceByLangCache.set(cacheKey, null);
    return null;
  }

  const primary = tl.split("-")[0] || "en";

  const candidates = voices.filter((v) => {
    const l = String(v.lang || "").toLowerCase().replace("_", "-");
    return l === tl || l.startsWith(`${primary}-`) || l === primary;
  });

  if (!candidates.length) return null;

  const scoreVoice = (v) => {
    const n = String(v.name || "").toLowerCase();
    let s = 0;
    if (n.includes("natural") || n.includes("neural")) s += 120;
    if (n.includes("microsoft")) s += 55;
    if (n.includes("google")) s += 42;
    if (primary === "en") {
      if (/\bjenny\b/.test(n)) s += 45;
      else if (/\baria\b/.test(n)) s += 42;
    }
    return s;
  };

  let best = candidates[0];
  let bestScore = scoreVoice(best);
  for (let i = 1; i < candidates.length; i++) {
    const v = candidates[i];
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  const bestVoice = bestScore > 0 ? best : null;
  flashVoiceByLangCache.set(cacheKey, bestVoice);
  return bestVoice;
}

/**
 * @param {string} text 
 * @param {string} lang 
 */
export function speakText(text, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  hookFlashSpeechVoicesOnce();
  const syn = window.speechSynthesis;
  // Avoid cancel overhead when nothing is currently queued.
  if (syn.speaking || syn.pending) syn.cancel();
  const gen = ++flashSpeakGeneration;
  let didFallbackToEnglish = false;

  const start = (langToUse) => {
    if (gen !== flashSpeakGeneration) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langToUse;
    const voice = pickBestSpeechVoice(langToUse);
    if (voice) u.voice = voice;
    u.onerror = () => {
      // Fallback nhanh nếu ngôn ngữ hiện tại không phát được.
      if (gen !== flashSpeakGeneration) return;
      if (!didFallbackToEnglish) {
        didFallbackToEnglish = true;
        start("en-US");
      }
    };
    syn.speak(u);
  };

  // Luôn phát ngay trong user-gesture để tránh bị browser chặn.
  start(lang || "en-US");
}

/**
 * @param {{ front: string, back: string }} card 
 */
export function speakFlashcard(card) {
  const front = String(card.front || "").trim();
  const back = String(card.back || "").trim();
  const text = front || back;
  if (!text) return;
  const useEn = /^[a-zA-Z0-9\s\-'.,]+$/.test(front);
  speakText(text, useEn ? "en-US" : "vi-VN");
}
