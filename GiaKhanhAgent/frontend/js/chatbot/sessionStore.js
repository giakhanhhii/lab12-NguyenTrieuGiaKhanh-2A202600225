import { LS_ACTIVE_SESSION, LS_SESSIONS } from "./constants.js";

const SAVE_SESSIONS_TIMEOUT_MS = 180;
const ACTIVE_PERSIST_MESSAGE_CAP = 100;
const INACTIVE_PERSIST_MESSAGE_CAP = 50;
const FALLBACK_ACTIVE_PERSIST_MESSAGE_CAP = 30;
const FALLBACK_INACTIVE_PERSIST_MESSAGE_CAP = 10;

function buildPersistSnapshot(activeCap, inactiveCap) {
  return sessions.map((session, idx) => {
    const srcMessages = Array.isArray(session?.messages) ? session.messages : [];
    const cap = idx === activeSession ? activeCap : inactiveCap;
    const shouldCap = Number.isFinite(cap) && cap >= 0;
    const messages = shouldCap && srcMessages.length > cap ? srcMessages.slice(-cap) : srcMessages;
    return { ...session, messages };
  });
}

function safeReadSessions() {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeSession).filter(Boolean) : [];
  } catch {
    return [];
  }
}

let sessions = safeReadSessions();
let activeSession = Number(localStorage.getItem(LS_ACTIVE_SESSION) || "0");
let saveQueued = false;

function makeDefaultSession(index) {
  return {
    title: `Đoạn chat ${index + 1}`,
    thread_id: "",
    messages: [],
    messagesLoaded: true,
    hasMoreRemote: false,
    remoteOffset: 0,
    pinned: false,
    experienceState: null,
  };
}

function normalizeSession(session, index = 0) {
  if (!session || typeof session !== "object") return null;
  const safeTitle = typeof session.title === "string" && session.title.trim()
    ? session.title.trim()
    : `Đoạn chat ${index + 1}`;
  const safeThread = typeof session.thread_id === "string" ? session.thread_id : "";
  const safeMessages = Array.isArray(session.messages) ? session.messages : [];
  const safeLoaded =
    typeof session.messagesLoaded === "boolean"
      ? session.messagesLoaded
      : !safeThread || safeMessages.length > 0;
  const safeHasMoreRemote = Boolean(session.hasMoreRemote);
  const safeRemoteOffsetRaw =
    typeof session.remoteOffset === "number" ? session.remoteOffset : safeMessages.length;
  const safeRemoteOffset = Number.isFinite(safeRemoteOffsetRaw) && safeRemoteOffsetRaw >= 0
    ? Math.floor(safeRemoteOffsetRaw)
    : safeMessages.length;
  return {
    title: safeTitle,
    thread_id: safeThread,
    messages: safeMessages,
    messagesLoaded: safeLoaded,
    hasMoreRemote: safeHasMoreRemote,
    remoteOffset: safeRemoteOffset,
    pinned: Boolean(session.pinned),
    experienceState:
      session.experienceState && typeof session.experienceState === "object"
        ? session.experienceState
        : null,
  };
}

export function ensureSessions() {
  if (!sessions.length) {
    sessions = [makeDefaultSession(0)];
  }
  if (!Number.isFinite(activeSession) || activeSession < 0 || activeSession >= sessions.length) {
    activeSession = 0;
  }
}

export function saveSessions() {
  if (saveQueued) return;
  saveQueued = true;
  const schedule = typeof globalThis.requestIdleCallback === "function"
    ? (cb) => globalThis.requestIdleCallback(cb, { timeout: SAVE_SESSIONS_TIMEOUT_MS })
    : (cb) => setTimeout(cb, 0);
  schedule(() => {
    saveQueued = false;
    try {
      const compactSessions = buildPersistSnapshot(ACTIVE_PERSIST_MESSAGE_CAP, INACTIVE_PERSIST_MESSAGE_CAP);
      localStorage.setItem(LS_SESSIONS, JSON.stringify(compactSessions));
      localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
    } catch {
      try {
        const fallbackSessions = buildPersistSnapshot(
          FALLBACK_ACTIVE_PERSIST_MESSAGE_CAP,
          FALLBACK_INACTIVE_PERSIST_MESSAGE_CAP,
        );
        localStorage.setItem(LS_SESSIONS, JSON.stringify(fallbackSessions));
        localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
      } catch {
        // Ignore storage write failures and keep in-memory state intact.
      }
    }
  });
}

export function getCurrentSession() {
  return sessions[activeSession] || sessions[0];
}

export function getActiveSessionIndex() {
  return activeSession;
}

export function setActiveSessionIndex(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) {
    activeSession = 0;
    return;
  }
  activeSession = n;
}

export function getSessionsSnapshot() {
  return sessions;
}

/**
 * @param {{ title?: string, experienceState?: any }} [opts]
 */
export function createSession(opts = {}) {
  const nextIndex = sessions.length;
  const next = makeDefaultSession(nextIndex);
  if (typeof opts.title === "string" && opts.title.trim()) {
    next.title = opts.title.trim();
  }
  if (opts.experienceState && typeof opts.experienceState === "object") {
    next.experienceState = opts.experienceState;
  }
  sessions.push(next);
  activeSession = nextIndex;
  return nextIndex;
}

/**
 * @param {number} idx
 * @param {any[]} messages
 * @param {{ hasMoreRemote?: boolean, remoteOffset?: number }} [opts]
 */
export function setSessionMessages(idx, messages, opts = {}) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions[n].messages = Array.isArray(messages) ? messages : [];
  sessions[n].messagesLoaded = true;
  sessions[n].hasMoreRemote = Boolean(opts.hasMoreRemote);
  const nextOffset = Number.isFinite(Number(opts.remoteOffset))
    ? Number(opts.remoteOffset)
    : sessions[n].messages.length;
  sessions[n].remoteOffset = Math.max(0, Math.floor(nextOffset));
  return true;
}

/**
 * @param {number} idx
 * @param {any[]} messages
 * @param {{ hasMoreRemote?: boolean, remoteOffset?: number }} [opts]
 */
export function prependSessionMessages(idx, messages, opts = {}) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  const incoming = Array.isArray(messages) ? messages : [];
  sessions[n].messages = [...incoming, ...(sessions[n].messages || [])];
  sessions[n].messagesLoaded = true;
  sessions[n].hasMoreRemote = Boolean(opts.hasMoreRemote);
  const nextOffset = Number.isFinite(Number(opts.remoteOffset))
    ? Number(opts.remoteOffset)
    : sessions[n].remoteOffset + incoming.length;
  sessions[n].remoteOffset = Math.max(0, Math.floor(nextOffset));
  return true;
}

/**
 * @param {number} idx
 */
export function resetSessionRemoteState(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions[n].messagesLoaded = !sessions[n].thread_id;
  sessions[n].hasMoreRemote = false;
  sessions[n].remoteOffset = sessions[n].messagesLoaded ? sessions[n].messages.length : 0;
  return true;
}

/**
 * @param {any} message
 */
export function appendMessageToCurrentSession(message) {
  const current = getCurrentSession();
  if (!current || typeof current !== "object") return;
  if (!Array.isArray(current.messages)) current.messages = [];
  current.messages.push(message);
  current.messagesLoaded = true;
  current.remoteOffset = Math.max(0, Math.floor(Number(current.remoteOffset || 0))) + 1;
}

export function renameSession(idx, nextTitle) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  if (typeof nextTitle !== "string" || !nextTitle.trim()) return false;
  sessions[n].title = nextTitle.trim();
  return true;
}

export function togglePinSession(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions[n].pinned = !sessions[n].pinned;
  return true;
}

export function deleteSession(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions.splice(n, 1);
  if (!sessions.length) {
    sessions = [makeDefaultSession(0)];
    activeSession = 0;
    return true;
  }
  if (activeSession === n) activeSession = Math.min(n, sessions.length - 1);
  else if (activeSession > n) activeSession -= 1;
  return true;
}

export function getCurrentExperienceState() {
  const s = getCurrentSession();
  if (!s || typeof s !== "object") return null;
  return s.experienceState && typeof s.experienceState === "object" ? s.experienceState : null;
}

/**
 * @param {any} next
 */
export function setCurrentExperienceState(next) {
  const s = getCurrentSession();
  if (!s || typeof s !== "object") return;
  if (!next || typeof next !== "object") {
    s.experienceState = null;
    return;
  }
  s.experienceState = next;
}

/**
 * @param {number} idx
 */
export function getSessionByIndex(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return null;
  return sessions[n];
}

/**
 * @param {string} kind
 * @param {{ excludeIndex?: number }} [opts]
 */
export function findSessionIndexByExperienceKind(kind, opts = {}) {
  const target = String(kind || "").trim().toLowerCase();
  if (!target) return -1;
  const excludeIndex = Number.isFinite(Number(opts.excludeIndex)) ? Math.floor(Number(opts.excludeIndex)) : -1;
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (i === excludeIndex) continue;
    const st = sessions[i]?.experienceState;
    const stKind = String(st?.kind || "").trim().toLowerCase();
    const completed = Boolean(st?.completed);
    if (stKind === target && !completed) return i;
  }
  return -1;
}

/**
 * Latest session index for an experience kind (including completed), scanning from the end of the list.
 * @param {string} kind
 */
export function findLatestSessionIndexByExperienceKind(kind) {
  const target = String(kind || "").trim().toLowerCase();
  if (!target) return -1;
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    const st = sessions[i]?.experienceState;
    const stKind = String(st?.kind || "").trim().toLowerCase();
    if (stKind === target) return i;
  }
  return -1;
}
