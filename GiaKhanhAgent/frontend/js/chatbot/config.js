/**
 * @param {Document} doc
 */
export function getApiOrigin(doc = document) {
  const raw = doc.querySelector('meta[name="teachly-api-base"]')?.getAttribute("content")?.trim();
  return (raw || window.location.origin).replace(/\/$/, "");
}

/**
 * @param {Document} doc
 */
export function getChatApiUrl(doc = document) {
  return `${getApiOrigin(doc)}/api/chat`;
}
