/** @type {File | null} */
let pending = null;

/** @param {File | null} f */
export function setPendingPdfFile(f) {
  pending = f;
}

/** @returns {File | null} */
export function takePendingPdfFile() {
  const x = pending;
  pending = null;
  return x;
}
