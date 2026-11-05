import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bot, History, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { chatAssistant } from "@/lib/analytics.functions";
import {
  appendMessage,
  contextMessages,
  loadThreads,
  newThreadId,
  relativeTime,
  removeThread,
  saveThreads,
  titleFrom,
  upsertThread,
  type ChatThread,
} from "@/lib/chat-threads";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";

const NO_MESSAGES: ChatThread["messages"] = [];

export function Assistant() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null); // null = unsaved new chat
  const [view, setView] = useState<"chat" | "history">("chat");
  const [text, setText] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const warnedRef = useRef(false);

  // Threads live in localStorage, so they can only be read after hydration.
  useEffect(() => {
    const saved = loadThreads();
    setThreads(saved);
    setActiveId(saved[0]?.id ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!saveThreads(threads) && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("Couldn't save chat history in this browser — threads won't persist.");
    }
  }, [threads, loaded]);

  const active = threads.find((t) => t.id === activeId);
  const msgs = active?.messages ?? NO_MESSAGES;
  const busy = activeId !== null && busyIds.includes(activeId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, busy, view]);

  const setBusyFor = (id: string, on: boolean) =>
    setBusyIds((b) => (on ? [...b, id] : b.filter((x) => x !== id)));

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const id = activeId ?? newThreadId();
    const userMsg = { role: "user" as const, content };
    const history = active?.messages ?? [];
    const now = Date.now();

    setThreads((prev) =>
      active
        ? appendMessage(prev, id, userMsg, now)
        : upsertThread(prev, {
            id,
            title: titleFrom([userMsg]),
            createdAt: now,
            updatedAt: now,
            messages: [userMsg],
          }),
    );
    setActiveId(id);
    setText("");
    setBusyFor(id, true);
    try {
      const res = await chatAssistant({
        data: { messages: contextMessages([...history, userMsg]) },
      });
      setThreads((prev) => appendMessage(prev, id, { role: "assistant", content: res.reply }));
    } catch (e) {
      setThreads((prev) =>
        appendMessage(prev, id, {
          role: "assistant",
          content: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
          error: true,
        }),
      );
    } finally {
      setBusyFor(id, false);
    }
  }

  function newChat() {
    setActiveId(null);
    setText("");
    setView("chat");
  }

  function openThread(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteThread(t: ChatThread) {
    setThreads((prev) => removeThread(prev, t.id));
    if (t.id === activeId) setActiveId(null);
    toast("Thread deleted", {
      action: { label: "Undo", onClick: () => setThreads((prev) => upsertThread(prev, t)) },
    });
  }

  function deleteAll() {
    setThreads([]);
    setActiveId(null);
    toast.success("All threads deleted");
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm">
          <Bot className="mr-1 h-3.5 w-3.5" />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="pr-8">
          <div className="flex items-center gap-1">
            {view === "history" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setView("chat")}
                aria-label="Back to chat"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle className="mr-auto truncate">
              {view === "history" ? "Saved threads" : "Supply chain assistant"}
            </SheetTitle>
            {view === "history" && threads.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete all
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all saved threads?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes {threads.length} saved{" "}
                      {threads.length === 1 ? "thread" : "threads"} from this browser and can't be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAll}>Delete all</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {view === "chat" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setView("history")}
                aria-label="Saved threads"
              >
                <History className="mr-1 h-3.5 w-3.5" />
                {threads.length}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={newChat} aria-label="New chat">
              <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </SheetHeader>

        {view === "history" ? (
          <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1 py-3">
            {threads.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No saved threads yet. Conversations are saved here automatically.
              </p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg border pr-1 transition-colors hover:bg-muted",
                  t.id === activeId && "border-primary/50 bg-muted",
                )}
              >
                <button
                  onClick={() => openThread(t.id)}
                  className="min-w-0 flex-1 px-3 py-2 text-left"
                >
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(t.updatedAt)} · {t.messages.length}{" "}
                    {t.messages.length === 1 ? "message" : "messages"}
                  </p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteThread(t)}
                  aria-label={`Delete thread: ${t.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto py-3">
              {msgs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Try: “Which plant has the lowest realisation?” or “Forecast Q4 revenue.”
                </p>
              )}
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div
                    key={i}
                    className="ml-8 whitespace-pre-wrap break-words rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  >
                    {m.content}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={cn(
                      "mr-4 min-w-0 rounded-xl bg-muted px-3 py-2",
                      m.error && "border border-destructive/40 text-destructive",
                    )}
                  >
                    <Markdown content={m.content} />
                  </div>
                ),
              )}
              {busy && <p className="text-xs text-muted-foreground">Analysing…</p>}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex gap-2"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask about revenue, plants, distributors…"
              />
              <Button type="submit" size="icon" disabled={busy} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
