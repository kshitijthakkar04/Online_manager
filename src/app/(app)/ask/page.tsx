"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, BookOpen, CalendarRange, Eraser, Network, Sparkles, Wand2 } from "lucide-react";
import { useNotch } from "@/components/notch";
import { AutoTextarea, Markdown, api, errorText, formatDate, todayISO } from "@/components/ui";
import type { AskSource, ChatTurn } from "@/lib/types";

type Message = ChatTurn & { sources?: AskSource[] };

const STORE_KEY = "kd:ask";
const SUGGESTIONS = [
  { icon: CalendarRange, text: "What did I learn this week?" },
  { icon: Wand2, text: "Give me a quick refresher on my latest topics" },
  { icon: Network, text: "Which of my topics connect to each other?" },
];

export default function AskPage() {
  const notch = useNotch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // Keep the conversation when you jump into a cited note and come back.
  // Saving waits until the restore has happened, so the empty initial state can't overwrite it.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages));
    } catch {}
    if (messages.length) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, restored]);

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
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-3xl flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-6 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-lamp-bright to-lamp-deep text-ink-950 shadow-[0_10px_40px_-8px_rgb(244_183_99/0.6)]">
            <span className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-lamp/40 blur-2xl" />
            <Sparkles className="size-7" strokeWidth={2} />
          </div>
          <p className="eyebrow">Ask</p>
          <h1 className="mt-2 font-serif text-[2.3rem] leading-tight tracking-[-0.015em] sm:text-[2.8rem]">Ask your knowledge</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-400">
            Answers come only from what you&apos;ve written — every claim linked back to the note it came from.
          </p>
          <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => ask(text)}
                className="card group flex flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-lamp/25"
              >
                <span className="flex w-full items-center justify-between">
                  <Icon className="size-4 text-lamp" />
                  <ArrowUpRight className="size-3.5 text-ink-500 opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="text-[13px] leading-snug text-ink-200">{text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-8 pb-8">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Ask your knowledge</p>
            <button onClick={() => setMessages([])} className="btn-ghost h-7 px-2 text-xs">
              <Eraser className="size-3.5" /> New chat
            </button>
          </div>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-b from-lamp/[0.16] to-lamp/[0.1] px-4 py-2.5 text-[15px] leading-relaxed text-ink-100 ring-1 ring-lamp/20">
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
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-lamp-bright to-lamp-deep text-ink-950">
                <Sparkles className="size-4 animate-pulse" />
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
        className="sticky bottom-[96px] md:bottom-4"
      >
        <div className="surface flex items-end gap-2 rounded-2xl bg-ink-900/95 p-2 pl-4 transition focus-within:border-lamp/35 focus-within:shadow-[0_0_0_4px_rgb(244_183_99/0.08)]">
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
            className="max-h-40 flex-1 bg-transparent py-2 text-[15px] caret-lamp outline-none placeholder:text-ink-500"
          />
          <button className="btn-primary size-9 shrink-0 rounded-xl px-0" disabled={!input.trim() || loading} aria-label="Ask">
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 hidden text-center text-[11px] text-ink-500 sm:block">
          <span className="kbd">↵</span> to ask · <span className="kbd">⇧</span> <span className="kbd">↵</span> for a new line
        </p>
      </form>
    </div>
  );
}

function Answer({ message }: { message: Message }) {
  const sources = message.sources ?? [];
  const byN = new Map(sources.map((s) => [s.n, s]));
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lamp-bright to-lamp-deep text-ink-950 shadow-[0_0_14px_rgb(244_183_99/0.3)]">
        <Sparkles className="size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-medium text-ink-400">
          {sources.length ? `Based on ${sources.length} of your notes` : "From your notes"}
        </p>
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
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <Link
                key={s.noteId}
                href={`/notes/${s.noteId}`}
                className="card group flex gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-lamp/25"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lamp/15 text-[11px] font-semibold text-lamp">{s.n}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-100 group-hover:text-lamp-bright">
                    <span className="truncate">{s.title}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-ink-500 opacity-0 transition group-hover:opacity-100" />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
                    <BookOpen className="size-3" /> {formatDate(s.entryDate)}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-400">{s.snippet}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
