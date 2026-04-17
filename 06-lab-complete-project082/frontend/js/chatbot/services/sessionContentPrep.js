/**
 * Chuẩn hóa pool mock: xáo trộn, loại trùng theo khóa, cắt đúng số lượng phiên.
 */

/**
 * @param {number} min
 * @param {number} max
 */
export function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fisher–Yates, in-place.
 * @template T
 * @param {T[]} arr
 */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * @param {string | undefined} raw
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
export function parseCountInRange(raw, min, max, fallback) {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * @template T
 * @param {T[]} pool
 * @param {(item: T) => string} keyFn
 * @param {number} want
 * @returns {T[]}
 */
export function pickUniqueShuffled(pool, keyFn, want) {
  const copy = pool.slice();
  shuffleInPlace(copy);
  const seen = new Set();
  const out = [];
  for (const item of copy) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= want) break;
  }
  return out;
}

/** @param {any} q */
export function quizDedupeKey(q) {
  const id = String(q?.id || "").trim();
  if (id) return `id:${id}`;
  const t = String(q?.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return t ? `t:${t.slice(0, 240)}` : "";
}

/** @param {any} c */
export function flashDedupeKey(c) {
  const id = String(c?.id || "").trim();
  if (id) return `id:${id}`;
  const f = String(c?.front || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return f ? `f:${f}` : "";
}

/** @param {any} s */
export function slideDedupeKey(s) {
  const id = String(s?.id || "").trim();
  if (id) return `id:${id}`;
  const t = String(s?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const b0 = Array.isArray(s?.bullets) ? String(s.bullets[0] || "") : "";
  return t ? `t:${t}#${b0.slice(0, 100)}` : "";
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareQuizSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 500, 10);
  const pool = Array.isArray(data?.questions) ? data.questions : [];
  const questions = pickUniqueShuffled(pool, quizDedupeKey, want);
  return { ...data, questions };
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareFlashSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 500, 20);
  const pool = Array.isArray(data?.cards) ? data.cards : [];
  const cards = pickUniqueShuffled(pool, flashDedupeKey, want);
  return { ...data, cards };
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareSlideSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 30, 10);
  const pool = Array.isArray(data?.slides) ? data.slides : [];
  const slides = pickUniqueShuffled(pool, slideDedupeKey, want);
  return { ...data, slides };
}
