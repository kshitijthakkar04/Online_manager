"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Clock, ExternalLink, FileText, Link2, PencilLine, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { NotchSubtitle, useNotch } from "./notch";
import { ReviewPanel } from "./review-panel";
import { Markdown, ScoreRing, api, errorText, formatDate } from "./ui";
import type { Note } from "@/lib/types";

type Tab = "note" | "original" | "review";

const TAB_META: Record<Tab, { label: string; icon: typeof FileText }> = {
  note: { label: "Note", icon: FileText },
  original: { label: "My original", icon: ScrollText },
  review: { label: "Review", icon: Sparkles },
};

export function NoteView({ note }: { note: Note }) {
  const router = useRouter();
  const notch = useNotch();
  const tabs: Tab[] = [...(note.final_note ? (["note"] as Tab[]) : []), "original", ...(note.review ? (["review"] as Tab[]) : [])];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [working, setWorking] = useState(false);

  const words = (note.final_note || note.raw_understanding).trim().split(/\s+/).length;
  const cite = (n: number) => {
    const c = note.citations[n - 1];
    return c ? { href: c.url, title: c.label } : null;
  };

  async function remove() {
    if (!confirm(`Delete “${note.title}”? This removes it from your library and from Ask.`)) return;
    setWorking(true);
    notch.busy("Deleting…");
    try {
      await api(`/api/notes/${note.id}`, { method: "DELETE" });
      notch.success("Entry deleted");
      router.push("/library");
      router.refresh();
    } catch (e) {
      notch.error(errorText(e));
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <NotchSubtitle text={note.title} />

      <div className="mb-8 flex items-center justify-between gap-2">
        <Link href="/library" className="btn-ghost -ml-3">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <div className="flex gap-1.5">
          <Link href={`/?id=${note.id}`} className="btn-soft">
            <PencilLine className="size-4" /> Edit
          </Link>
          <button onClick={remove} disabled={working} className="btn-ghost px-2.5 hover:bg-bad/10 hover:text-bad" title="Delete entry" aria-label="Delete entry">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <article className="min-w-0">
          <p className="eyebrow">{formatDate(note.entry_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          <h1 className="mt-3 font-serif text-[2.3rem] leading-[1.1] tracking-[-0.015em] text-balance text-ink-100 sm:text-[3rem]">
            {note.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-400">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {Math.max(1, Math.round(words / 200))} min read
            </span>
            {note.tags.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {note.tags.map((t) => (
                  <span key={t} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-ink-300">
                    {t}
                  </span>
                ))}
              </span>
            )}
          </div>

          {tabs.length > 1 && (
            <div className="mt-8 inline-flex gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-white/[0.06]">
              {tabs.map((key) => {
                const { label, icon: Icon } = TAB_META[key];
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                      tab === key ? "text-ink-100" : "text-ink-400 hover:text-ink-200"
                    }`}
                  >
                    {tab === key && (
                      <motion.span
                        layoutId="note-tab"
                        className="absolute inset-0 rounded-lg bg-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <Icon className="relative size-3.5" />
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-8">
            {tab === "note" && note.final_note && <Markdown cite={cite}>{note.final_note}</Markdown>}
            {tab === "original" && (
              <div className="font-serif text-[1.15rem] leading-[1.85] whitespace-pre-wrap text-ink-200">{note.raw_understanding}</div>
            )}
            {tab === "review" && (
              <div className="card">
                <ReviewPanel review={note.review} />
              </div>
            )}
          </motion.div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {note.review && (
            <button
              onClick={() => setTab("review")}
              className="card flex w-full items-center gap-4 p-5 text-left transition hover:border-white/[0.12]"
            >
              <ScoreRing value={note.review.overall} size={68} />
              <div className="min-w-0">
                <p className="eyebrow">Gemini&apos;s verdict</p>
                <p className="mt-1 line-clamp-3 font-serif text-[0.95rem] leading-snug text-ink-200">{note.review.verdict}</p>
              </div>
            </button>
          )}

          <div className="card divide-y divide-white/[0.05]">
            <div className="p-5">
              <p className="eyebrow mb-3 flex items-center gap-1.5">
                <Link2 className="size-3.5" /> Sources
              </p>
              {note.citations.length ? (
                <ol className="space-y-2.5">
                  {note.citations.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-lamp/15 text-[10px] font-semibold text-lamp">
                        {i + 1}
                      </span>
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="group text-ink-200 hover:text-lamp">
                          {c.label}
                          <ExternalLink className="ml-1 inline size-3 text-ink-500 group-hover:text-lamp" />
                        </a>
                      ) : (
                        <span className="text-ink-200">{c.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-ink-500">No sources added.</p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5 text-[13px]">
              <div>
                <dt className="text-[11px] text-ink-500">Written</dt>
                <dd className="mt-0.5 text-ink-200">{formatDate(note.entry_date)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-500">Words</dt>
                <dd className="mt-0.5 text-ink-200 tabular-nums">{words}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
