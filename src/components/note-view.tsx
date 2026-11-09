"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { NotchSubtitle, useNotch } from "./notch";
import { ReviewPanel } from "./review-panel";
import { Markdown, ScoreBadge, api, errorText, formatDate } from "./ui";
import type { Note } from "@/lib/types";

type Tab = "note" | "original" | "review";

export function NoteView({ note }: { note: Note }) {
  const router = useRouter();
  const notch = useNotch();
  const tabs: [Tab, string][] = [
    ...(note.final_note ? [["note", "Note"] as [Tab, string]] : []),
    ["original", "My original"],
    ...(note.review ? [["review", "Review"] as [Tab, string]] : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0][0]);
  const [working, setWorking] = useState(false);

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
      notch.success("Note deleted");
      router.push("/library");
      router.refresh();
    } catch (e) {
      notch.error(errorText(e));
      setWorking(false);
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      <NotchSubtitle text={note.title} />

      <div className="mb-8 flex items-center justify-between gap-2">
        <Link href="/library" className="btn-ghost -ml-3">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <div className="flex gap-1">
          <Link href={`/?id=${note.id}`} className="btn-soft">
            <PencilLine className="size-4" /> Edit
          </Link>
          <button onClick={remove} disabled={working} className="btn-ghost px-2.5 hover:text-bad" title="Delete">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <p className="eyebrow">{formatDate(note.entry_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{note.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {note.overall_score !== null && <ScoreBadge value={note.overall_score} />}
        {note.tags.map((t) => (
          <span key={t} className="chip">
            #{t}
          </span>
        ))}
      </div>

      {tabs.length > 1 && (
        <div className="mt-8 inline-flex gap-1 rounded-2xl border border-white/[0.06] bg-ink-900/60 p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative rounded-xl px-4 py-1.5 text-sm font-medium transition ${
                tab === key ? "text-ink-100" : "text-ink-400 hover:text-ink-200"
              }`}
            >
              {tab === key && <motion.span layoutId="note-tab" className="absolute inset-0 rounded-xl bg-white/[0.07]" />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {tab === "note" && note.final_note && <Markdown cite={cite}>{note.final_note}</Markdown>}
        {tab === "original" && (
          <div className="font-serif text-[1.15rem] leading-[1.8] whitespace-pre-wrap text-ink-200">{note.raw_understanding}</div>
        )}
        {tab === "review" && (
          <div className="card">
            <ReviewPanel review={note.review} />
          </div>
        )}
      </div>

      {note.citations.length > 0 && (
        <section className="mt-12 border-t border-white/[0.06] pt-6">
          <p className="eyebrow mb-3">Sources</p>
          <ol className="space-y-2">
            {note.citations.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="grid size-5 shrink-0 place-items-center rounded-md bg-lamp/15 text-[11px] font-semibold text-lamp">
                  {i + 1}
                </span>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 text-ink-200 hover:text-lamp">
                    {c.label}
                    <ExternalLink className="size-3 text-ink-500 group-hover:text-lamp" />
                  </a>
                ) : (
                  <span className="text-ink-200">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
