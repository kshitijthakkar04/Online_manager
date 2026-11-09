"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Feather,
  FileText,
  Link2,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useNotch } from "./notch";
import { ReviewPanel } from "./review-panel";
import { AutoTextarea, EmptyState, Markdown, api, errorText, formatDate, todayISO } from "./ui";
import type { Citation, Note, Review } from "@/lib/types";

type Draft = {
  id?: string;
  entry_date: string;
  title: string;
  understanding: string;
  citations: Citation[];
  review: Review | null;
  reviewedText: string | null;
  finalNote: string;
};

const DRAFT_KEY = "kd:draft";

const blankDraft = (): Draft => ({
  entry_date: todayISO(),
  title: "",
  understanding: "",
  citations: [],
  review: null,
  reviewedText: null,
  finalNote: "",
});

type Busy = "review" | "compose" | "save" | null;

export function Composer() {
  const router = useRouter();
  const editId = useSearchParams().get("id");
  const notch = useNotch();

  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [panel, setPanel] = useState<"review" | "final">("review");
  const [editingFinal, setEditingFinal] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const update = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  // Load: an existing note when editing, otherwise the autosaved draft.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (editId) {
        try {
          const note = await api<Note>(`/api/notes/${editId}`);
          if (cancelled) return;
          setDraft({
            id: note.id,
            entry_date: note.entry_date,
            title: note.title,
            understanding: note.raw_understanding,
            citations: note.citations,
            review: note.review,
            reviewedText: note.review ? note.raw_understanding : null,
            finalNote: note.final_note ?? "",
          });
          if (note.final_note) setPanel("final");
        } catch (e) {
          notch.error(errorText(e));
        }
      } else {
        try {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) {
            const d = JSON.parse(saved) as Draft;
            setDraft({ ...blankDraft(), ...d, id: undefined });
            if (d.finalNote) setPanel("final");
          }
        } catch {}
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Put the cursor in the title on a blank entry (not on touch screens, where it pops the keyboard).
  useEffect(() => {
    if (loaded && !editId && !draft.title && !draft.understanding && matchMedia("(pointer: fine)").matches) {
      titleRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Autosave new entries locally so nothing is lost on refresh.
  useEffect(() => {
    if (!loaded || draft.id) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft, loaded]);

  const words = draft.understanding.trim() ? draft.understanding.trim().split(/\s+/).length : 0;
  const canReview = draft.title.trim().length > 0 && words >= 15 && !busy;
  const reviewStale = Boolean(draft.review && draft.reviewedText !== draft.understanding);

  async function runReview() {
    if (!canReview) return;
    setBusy("review");
    setPanel("review");
    notch.busy("Gemini is reading your understanding…");
    try {
      const review = await api<Review>("/api/review", {
        body: { title: draft.title, understanding: draft.understanding, citations: draft.citations },
      });
      update({ review, reviewedText: draft.understanding });
      const major = review.pushback.filter((p) => p.severity === "major").length;
      notch.success(
        `Scored ${review.overall.toFixed(1)}/10${major ? ` · ${major} thing${major > 1 ? "s" : ""} to fix` : ""}`,
      );
    } catch (e) {
      notch.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function runCompose() {
    if (!draft.title.trim() || !draft.understanding.trim() || busy) return;
    setBusy("compose");
    setPanel("final");
    setEditingFinal(false);
    notch.busy("Writing it the way you would…");
    update({ finalNote: "" });
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          understanding: draft.understanding,
          citations: draft.citations,
          review: draft.review,
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Writing failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        update({ finalNote: text });
      }
      notch.success("Your note is ready — tweak it, then save");
    } catch (e) {
      notch.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft.title.trim() || !draft.understanding.trim() || busy) return;
    setBusy("save");
    notch.busy("Saving to your knowledge…");
    try {
      const res = await api<{ id: string }>("/api/notes", {
        body: {
          id: draft.id,
          entry_date: draft.entry_date,
          title: draft.title,
          raw_understanding: draft.understanding,
          final_note: draft.finalNote || null,
          citations: draft.citations,
          review: draft.review,
        },
      });
      if (!draft.id) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
      }
      notch.success("Saved to your knowledge");
      router.push(`/notes/${res.id}`);
      router.refresh();
    } catch (e) {
      notch.error(errorText(e));
      setBusy(null);
    }
  }

  function startOver() {
    if ((draft.understanding || draft.title) && !confirm("Clear this entry and start fresh?")) return;
    setDraft(blankDraft());
    setPanel("review");
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    if (editId) router.replace("/");
  }

  // ⌘↵ review · ⌘S save
  const keys = useRef({ runReview, save });
  keys.current = { runReview, save };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        keys.current.runReview();
      } else if (e.key === "s") {
        e.preventDefault();
        keys.current.save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steps = [
    { label: "Write", done: words >= 15 },
    { label: "Review", done: Boolean(draft.review) && !reviewStale },
    { label: "Your voice", done: Boolean(draft.finalNote) },
    { label: "Save", done: false },
  ];
  const current = steps.findIndex((s) => !s.done);
  const canWrite = Boolean(draft.title.trim() && draft.understanding.trim()) && !busy;
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-10">
      {/* ---------- Editor ---------- */}
      <section className="min-w-0">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div>
            <p className="eyebrow flex items-center gap-2">
              {draft.id ? "Editing entry" : "Today's entry"}
              {draft.id && <span className="size-1 rounded-full bg-lamp" />}
            </p>
            <label className="group relative mt-2 flex cursor-pointer items-center gap-2">
              <h1 className="font-serif text-[2.1rem] leading-[1.1] tracking-[-0.015em] text-ink-100 sm:text-[2.6rem]">
                {formatDate(draft.entry_date, { weekday: "long", month: "long", day: "numeric" })}
              </h1>
              <CalendarDays className="size-4 text-ink-500 transition group-hover:text-lamp" />
              <input
                type="date"
                value={draft.entry_date}
                onChange={(e) => e.target.value && update({ entry_date: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Entry date"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <ol className="flex items-center" aria-label="Progress">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5" aria-current={i === current ? "step" : undefined}>
                    <span
                      className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold transition ${
                        s.done
                          ? "bg-lamp text-ink-950 shadow-[0_0_12px_rgb(244_183_99/0.5)]"
                          : i === current
                            ? "text-lamp ring-1 ring-lamp/60"
                            : "text-ink-500 ring-1 ring-white/[0.1]"
                      }`}
                    >
                      {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`hidden text-[10px] font-medium sm:block ${i === current ? "text-ink-100" : "text-ink-500"}`}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className={`mx-1.5 mb-0 h-px w-5 sm:mb-5 sm:w-7 ${steps[i].done ? "bg-lamp/60" : "bg-white/[0.1]"}`} />
                  )}
                </li>
              ))}
            </ol>
            <button onClick={startOver} className="btn-ghost h-8 px-2.5 text-xs sm:mb-5" title="Start a new entry">
              <RotateCcw className="size-3.5" /> New
            </button>
          </div>
        </header>

        {/* The page: clearly bounded so it reads as somewhere to write. */}
        <div className="card relative overflow-hidden transition duration-200 focus-within:border-lamp/35 focus-within:shadow-[0_0_0_4px_rgb(244_183_99/0.08),0_20px_50px_-20px_rgb(0_0_0/0.8)]">
          <label className="block px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
            <span className="eyebrow flex items-center gap-1.5">
              <PencilLine className="size-3.5 text-lamp" /> Topic
            </span>
            <AutoTextarea
              ref={titleRef}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  bodyRef.current?.focus();
                }
              }}
              minRows={1}
              placeholder="What did you learn today?"
              className="mt-2.5 w-full bg-transparent font-serif text-[1.9rem] leading-tight tracking-[-0.01em] text-ink-100 caret-lamp outline-none placeholder:text-ink-500 sm:text-[2.3rem]"
            />
          </label>
          <div className="mx-5 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.05] to-transparent sm:mx-8" />
          <label className="block cursor-text px-5 pt-5 pb-7 sm:px-8">
            <span className="eyebrow">What I understood — in my own words</span>
            <AutoTextarea
              ref={bodyRef}
              value={draft.understanding}
              onChange={(e) => update({ understanding: e.target.value })}
              minRows={9}
              placeholder={"Explain it like you'd tell a friend.\n\nNo copy-pasting — what do you actually understand? Where does it get fuzzy?"}
              className="mt-2.5 w-full bg-transparent font-serif text-[1.15rem] leading-[1.85] text-ink-100 caret-lamp outline-none placeholder:text-ink-500"
            />
          </label>

          {/* Sources */}
          <div className="border-t border-white/[0.06] bg-white/[0.015] px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1 flex items-center gap-1.5">
                <Link2 className="size-3.5" /> Sources
              </span>
              {draft.citations.map((c, i) => (
                <span key={i} className="chip max-w-full py-1 pr-1">
                  <span className="font-semibold text-lamp">{i + 1}</span>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" className="max-w-[220px] truncate hover:text-ink-100">
                      {c.label || c.url}
                    </a>
                  ) : (
                    <span className="max-w-[220px] truncate">{c.label}</span>
                  )}
                  <button
                    onClick={() => update({ citations: draft.citations.filter((_, j) => j !== i) })}
                    className="grid size-5 place-items-center rounded-full hover:bg-white/10"
                    aria-label="Remove source"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {!addingSource && (
                <button onClick={() => setAddingSource(true)} className="chip border-dashed py-1 transition hover:border-lamp/40 hover:text-lamp">
                  <Plus className="size-3" /> {draft.citations.length ? "Add" : "Add a book, article or video"}
                </button>
              )}
            </div>
            <AnimatePresence>
              {addingSource && (
                <SourceForm
                  onAdd={(c) => {
                    update({ citations: [...draft.citations, c] });
                    setAddingSource(false);
                  }}
                  onCancel={() => setAddingSource(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action bar */}
        <div className="sticky bottom-[96px] z-30 mt-5 md:bottom-4">
          <div className="surface flex flex-wrap items-center gap-2 rounded-2xl bg-ink-900/95 p-2 sm:pl-5">
            <span className="mr-auto hidden items-center gap-2 text-xs text-ink-400 tabular-nums sm:flex">
              {words} {words === 1 ? "word" : "words"}
              {words > 0 && <span className="text-ink-600">·</span>}
              {words > 0 && `${minutes} min read`}
              {reviewStale && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-warn">
                  <span className="size-1.5 rounded-full bg-warn" /> Edited since review
                </span>
              )}
            </span>
            <button onClick={runReview} disabled={!canReview} className="btn-soft flex-1 sm:flex-none" title="Review (⌘↵)">
              <Sparkles className="size-4 text-lamp" />
              {draft.review ? "Re-review" : "Review"}
              <span className="kbd hidden lg:inline-grid">⌘↵</span>
            </button>
            <button onClick={runCompose} disabled={!canWrite} className="btn-soft flex-1 sm:flex-none">
              <Feather className="size-4 text-lamp" />
              {draft.finalNote ? "Rewrite" : <span>Write<span className="hidden sm:inline"> in my voice</span></span>}
            </button>
            <button onClick={save} disabled={!canWrite} className="btn-primary flex-1 sm:flex-none" title="Save (⌘S)">
              <Check className="size-4" strokeWidth={2.5} />
              Save
              <span className="kbd hidden border-ink-950/20 bg-ink-950/10 text-ink-950/70 lg:inline-grid">⌘S</span>
            </button>
            {words < 15 && (
              <p className="w-full pb-1 text-center text-xs text-ink-400">
                {!draft.title.trim() || words === 0
                  ? "Type a topic and what you understood above — Review unlocks at 15 words."
                  : `${15 - words} more word${15 - words === 1 ? "" : "s"} to unlock Review.`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Gemini panel ---------- */}
      <aside className="min-w-0 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start">
        <div className="card flex h-full flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-lamp-bright to-lamp-deep text-ink-950 shadow-[0_0_16px_rgb(244_183_99/0.35)]">
              <Sparkles className="size-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-100">Gemini coach</p>
              <p className="text-xs text-ink-400">Reviews your understanding, then writes it your way</p>
            </div>
          </div>
          <div className="mx-4 mb-1 flex gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-white/[0.05]">
            {(
              [
                ["review", "Review", Sparkles],
                ["final", "Final note", FileText],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium transition ${
                  panel === key ? "text-ink-100" : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {panel === key && (
                  <motion.span
                    layoutId="panel-tab"
                    className="absolute inset-0 rounded-lg bg-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="relative size-3.5" />
                <span className="relative">{label}</span>
                {key === "review" && draft.review && (
                  <span className="relative text-[11px] text-ink-400 tabular-nums">{draft.review.overall.toFixed(1)}</span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[320px] flex-1 overflow-y-auto">
            {panel === "review" ? (
              <ReviewPanel review={draft.review} loading={busy === "review"} stale={reviewStale} />
            ) : (
              <FinalPanel
                text={draft.finalNote}
                streaming={busy === "compose"}
                editing={editingFinal}
                setEditing={setEditingFinal}
                onChange={(finalNote) => update({ finalNote })}
                citations={draft.citations}
                onCompose={runCompose}
                canCompose={Boolean(draft.title.trim() && draft.understanding.trim()) && !busy}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SourceForm({ onAdd, onCancel }: { onAdd: (c: Citation) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const valid = label.trim() || url.trim();
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onAdd({ label: label.trim() || url.trim(), url: url.trim() || undefined });
      }}
    >
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input autoFocus className="field" placeholder="Title — e.g. “Designing Data-Intensive Apps, ch. 5”" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="relative sm:w-[42%]">
          <Link2 className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-500" />
          <input className="field pl-8" placeholder="https://… (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <button className="btn-soft" disabled={!valid}>Add</button>
          <button type="button" onClick={onCancel} className="btn-ghost px-2" aria-label="Cancel">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.form>
  );
}

function FinalPanel(props: {
  text: string;
  streaming: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onChange: (v: string) => void;
  citations: Citation[];
  onCompose: () => void;
  canCompose: boolean;
}) {
  const { text, streaming, editing, setEditing, onChange, citations } = props;

  if (!text && !streaming) {
    return (
      <EmptyState icon={<Feather className="size-5" />} title="Your note, in your voice">
        Gemini rewrites your understanding the way you write — with every correction from the review folded in. Teach
        it your voice on the <span className="text-ink-200">My voice</span> page.
        <div className="mt-5">
          <button onClick={props.onCompose} disabled={!props.canCompose} className="btn-primary">
            <Feather className="size-4" /> Write in my voice
          </button>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">{streaming ? "Writing…" : editing ? "Editing" : "Preview"}</span>
        {!streaming && (
          <button onClick={() => setEditing(!editing)} className="btn-ghost h-7 px-2 text-xs">
            {editing ? <Check className="size-3.5" /> : <PencilLine className="size-3.5" />}
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>
      {editing ? (
        <AutoTextarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="field font-mono text-[13px] leading-relaxed"
          minRows={14}
        />
      ) : (
        <div className={streaming ? "caret" : ""}>
          <Markdown
            className="prose-diary text-[1.02rem]"
            cite={(n) => {
              const c = citations[n - 1];
              return c ? { href: c.url, title: c.label } : null;
            }}
          >
            {text}
          </Markdown>
        </div>
      )}
    </div>
  );
}
