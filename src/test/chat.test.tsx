import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Markdown } from "@/components/dash/Markdown";
import {
  MAX_THREADS,
  STORAGE_KEY,
  appendMessage,
  contextMessages,
  loadThreads,
  removeThread,
  saveThreads,
  titleFrom,
  upsertThread,
  type ChatThread,
} from "@/lib/chat-threads";

const thread = (id: string, updatedAt: number, content = "hi"): ChatThread => ({
  id,
  title: content,
  createdAt: updatedAt,
  updatedAt,
  messages: [{ role: "user", content }],
});

describe("chat threads", () => {
  beforeEach(() => localStorage.clear());

  it("titles a thread from the first user message, truncated", () => {
    expect(titleFrom([])).toBe("New chat");
    expect(titleFrom([{ role: "user", content: "  top\n plants  " }])).toBe("top plants");
    expect(titleFrom([{ role: "user", content: "x".repeat(200) }]).length).toBeLessThanOrEqual(60);
  });

  it("round-trips through localStorage, newest first", () => {
    saveThreads([thread("a", 1), thread("b", 2)]);
    expect(loadThreads().map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("ignores corrupt or malformed storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadThreads()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([thread("ok", 1), { id: 1 }, null]));
    expect(loadThreads().map((t) => t.id)).toEqual(["ok"]);
  });

  it("upserts without duplicating and caps the list", () => {
    let list: ChatThread[] = [];
    for (let i = 0; i < MAX_THREADS + 5; i++) list = upsertThread(list, thread(`t${i}`, i));
    expect(list).toHaveLength(MAX_THREADS);
    expect(list[0]?.id).toBe(`t${MAX_THREADS + 4}`);
    list = upsertThread(list, { ...thread("t10", 10_000), title: "renamed" });
    expect(list.filter((t) => t.id === "t10")).toHaveLength(1);
    expect(list[0]?.id).toBe("t10");
  });

  it("appends to a thread, ignores deleted ones, and removes", () => {
    const list = [thread("a", 1)];
    const next = appendMessage(list, "a", { role: "assistant", content: "yo" }, 99);
    expect(next[0]?.messages).toHaveLength(2);
    expect(next[0]?.updatedAt).toBe(99);
    expect(appendMessage(list, "gone", { role: "assistant", content: "x" })).toBe(list);
    expect(removeThread(next, "a")).toEqual([]);
  });

  it("keeps failed-request placeholders out of the model context", () => {
    expect(
      contextMessages([
        { role: "user", content: "q" },
        { role: "assistant", content: "Request failed", error: true },
        { role: "user", content: "q2" },
      ]),
    ).toEqual([
      { role: "user", content: "q" },
      { role: "user", content: "q2" },
    ]);
  });
});

describe("assistant Markdown", () => {
  it("renders a list directly after an intro line and bold text without raw markers", () => {
    const { container } = render(
      <Markdown content={"**Top plants**\n- Pune: **₹12 Cr**\n- Nashik: ₹9 Cr\n  - nested note"} />,
    );
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.querySelector("ul ul")).not.toBeNull();
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toMatch(/^\s*-\s/m);
  });

  it("renders headings, tables and inline code", () => {
    const md = "## Summary\n\n| Plant | Sales |\n|---|---|\n| Pune | 12 |\n\nUse `group_by`.";
    const { container } = render(<Markdown content={md} />);
    expect(screen.getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(2);
    expect(container.querySelector("code")?.textContent).toBe("group_by");
    expect(container.textContent).not.toContain("|");
  });

  it("does not render raw HTML from the model", () => {
    const { container } = render(<Markdown content={'<img src=x onerror="alert(1)"> hi'} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
