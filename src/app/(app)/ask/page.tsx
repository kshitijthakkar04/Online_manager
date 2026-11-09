"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Eraser, Sparkles } from "lucide-react";
import { useNotch } from "@/components/notch";
import { AutoTextarea, Markdown, api, errorText, formatDate, todayISO } from "@/components/ui";
import type { AskSource, ChatTurn } from "@/lib/types";

type Message = ChatTurn & { sources?: AskSource[] };

const STORE_KEY = "kd:ask";
const SUGGESTIONS = [
  "What did I learn this week?",
  "Explain the key ideas I've written about, as a quick refresher",
  "Which topics connect to each other in my notes?",
];

export default function AskPage() {
  const notch = useNotch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // Keep the conversation when you jump into a cited note and come back.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages));
    } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function ask(question = input) {
    const q = question.trim();
    if (!q || loading) return;
    const history: ChatTurn[] = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    notch.busy("Searching your notes…");
    try {
      const res = await api<{ answer: string; sources: AskSource[] }>("/api/ask", {
        body: { question: q, history, today: todayISO() },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
      notch.success(res.sources.length ? `Answered from ${res.sources.length} note${res.sources.length > 1 ? "s" : ""}` : "No matching notes");
    } catch (e) {
      notch.error(errorText(e));
      setMessages((m) => m.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-lamp/25 to-lamp/5 text-lamp ring-1 ring-lamp/20">
            <Sparkles className="size-6" />
          </div>
          <h1 className="font-serif text-4xl tracking-tight">Ask your knowledge</h1>
          <p className="mt-2 max-w-md text-sm text-ink-400">
            Answers come only from what you&apos;ve written, with links back to the exact notes.
          </p>
          <div className="mt-8 flex max-w-xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="chip px-3.5 py-1.5 text-[13px] transition hover:border-lamp/30 hover:text-ink-100">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-8 py-6">
          <div className="flex justify-end">
            <button onClick={() => setMessages([])} className="btn-ghost h-7 px-2 text-xs">
              <Eraser className="size-3.5" /> Clear
            </button>
          </div>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-lamp/[0.12] px-4 py-2.5 text-[15px] text-ink-100 ring-1 ring-lamp/15">
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <Answer message={m} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex items-center gap-3 text-sm">
              <span className="grid size-7 place-items-center rounded-lg bg-lamp/10">
                <Sparkles className="size-3.5 animate-pulse text-lamp" />
              </span>
              <span className="shimmer-text">Reading your notes…</span>
            </div>
          )}
          <div ref={bottom} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="sticky bottom-24 md:bottom-4"
      >
        <div className="card flex items-end gap-2 p-2 pl-4 shadow-2xl shadow-black/50 focus-within:border-lamp/30">
          <AutoTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            minRows={1}
            placeholder="What do I know about…"
            className="max-h-40 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-500"
          />
          <button className="btn-primary size-9 shrink-0 px-0" disabled={!input.trim() || loading} aria-label="Ask">
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Answer({ message }: { message: Message }) {
  const sources = message.sources ?? [];
  const byN = new Map(sources.map((s) => [s.n, s]));
  return (
    <div className="flex gap-3">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-lamp/10">
        <Sparkles className="size-3.5 text-lamp" />
      </span>
      <div className="min-w-0 flex-1">
        <Markdown
          className="text-[1.05rem]"
          cite={(n) => {
            const s = byN.get(n);
            return s ? { href: `/notes/${s.noteId}`, title: s.title } : null;
          }}
        >
          {message.content}
        </Markdown>
        {sources.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <Link
                key={s.noteId}
                href={`/notes/${s.noteId}`}
                className="card group flex gap-3 p-3 transition hover:border-lamp/25"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lamp/15 text-[11px] font-semibold text-lamp">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-100 group-hover:text-lamp">
                    <BookOpen className="size-3.5 shrink-0 text-ink-500" />
                    <span className="truncate">{s.title}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {formatDate(s.entryDate)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">{s.snippet}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
