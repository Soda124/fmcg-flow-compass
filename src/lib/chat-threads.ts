export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  /** Set on assistant messages that are request failures; kept out of the model context. */
  error?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMsg[];
};

export const STORAGE_KEY = "fmcg-assistant-threads-v1";
export const MAX_THREADS = 50;
const TITLE_MAX = 60;

export function newThreadId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Thread title = first user message, whitespace collapsed and truncated. */
export function titleFrom(messages: ChatMsg[]): string {
  const first = messages
    .find((m) => m.role === "user")
    ?.content.replace(/\s+/g, " ")
    .trim();
  if (!first) return "New chat";
  return first.length > TITLE_MAX ? `${first.slice(0, TITLE_MAX - 1).trimEnd()}…` : first;
}

function isMsg(m: unknown): m is ChatMsg {
  if (!m || typeof m !== "object") return false;
  const o = m as Record<string, unknown>;
  return (o["role"] === "user" || o["role"] === "assistant") && typeof o["content"] === "string";
}

function isThread(t: unknown): t is ChatThread {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    typeof o["title"] === "string" &&
    typeof o["createdAt"] === "number" &&
    typeof o["updatedAt"] === "number" &&
    Array.isArray(o["messages"]) &&
    o["messages"].every(isMsg)
  );
}

function sortRecent(threads: ChatThread[]): ChatThread[] {
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Reads saved threads; malformed or unavailable storage yields an empty list. */
export function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? sortRecent(parsed.filter(isThread)) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refused the write (quota, private mode, …). */
export function saveThreads(threads: ChatThread[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    return true;
  } catch {
    return false;
  }
}

/** Inserts or replaces a thread, newest first, capped at MAX_THREADS. */
export function upsertThread(threads: ChatThread[], thread: ChatThread): ChatThread[] {
  const rest = threads.filter((t) => t.id !== thread.id);
  return sortRecent([thread, ...rest]).slice(0, MAX_THREADS);
}

export function removeThread(threads: ChatThread[], id: string): ChatThread[] {
  return threads.filter((t) => t.id !== id);
}

/** Appends a message to an existing thread (no-op if it was deleted meanwhile). */
export function appendMessage(
  threads: ChatThread[],
  id: string,
  msg: ChatMsg,
  now = Date.now(),
): ChatThread[] {
  const t = threads.find((x) => x.id === id);
  if (!t) return threads;
  const messages = [...t.messages, msg];
  return upsertThread(threads, { ...t, messages, title: titleFrom(messages), updatedAt: now });
}

/** Messages worth sending to the model: drops failed-request placeholders. */
export function contextMessages(messages: ChatMsg[]): { role: ChatMsg["role"]; content: string }[] {
  return messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
