/**
 * @param {string} apiUrl
 * @param {string} message
 * @param {string} [threadId]
 */
export async function postChat(apiUrl, message, threadId) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Lỗi API");
  return data;
}

/**
 * @param {Document} doc
 */
function getApiOrigin(doc = document) {
  const raw = doc.querySelector('meta[name="teachly-api-base"]')?.getAttribute("content")?.trim();
  return (raw || window.location.origin).replace(/\/$/, "");
}

/**
 * @param {string} threadId
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export async function getSessionMessages(threadId, opts = {}) {
  const safeThreadId = String(threadId || "").trim();
  if (!safeThreadId) {
    return {
      thread_id: "",
      limit: Number(opts.limit ?? 20),
      offset: Number(opts.offset ?? 0),
      total: 0,
      has_more: false,
      messages: [],
    };
  }
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 20),
    offset: String(opts.offset ?? 0),
  });
  const res = await fetch(`${getApiOrigin()}/api/sessions/${encodeURIComponent(safeThreadId)}/messages?${params}`);
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) {
    // Backward-compatible fallback when backend hasn't reloaded new routes yet.
    return {
      thread_id: safeThreadId,
      limit: Number(opts.limit ?? 20),
      offset: Number(opts.offset ?? 0),
      total: 0,
      has_more: false,
      messages: [],
    };
  }
  if (!res.ok) throw new Error(data.detail || "Lỗi API");
  return data;
}
