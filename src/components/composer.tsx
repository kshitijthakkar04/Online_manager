"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { AutoTextarea, Markdown, api, errorText, formatDate, todayISO } from "./ui";
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

  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-10">
      {/* ---------- Editor ---------- */}
      <section className={`min-w-0 transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                    s.done ? "bg-good/10 text-good" : "bg-white/[0.03] text-ink-400"
                  }`}
                >
                  {s.done ? <Check className="size-3" strokeWidth={3} /> : <span className="tabular-nums">{i + 1}</span>}
                  {s.label}
                </span>
                {i < steps.length - 1 && <span className="hidden h-px w-3 bg-ink-700 sm:block" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {draft.id && <span className="chip">Editing saved note</span>}
            <label className="chip relative cursor-pointer hover:text-ink-100">
              {formatDate(draft.entry_date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              <input
                type="date"
                value={draft.entry_date}
                onChange={(e) => e.target.value && update({ entry_date: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Entry date"
              />
            </label>
            <button onClick={startOver} className="btn-ghost h-7 px-2 text-xs" title="Start a new entry">
              <RotateCcw className="size-3.5" /> New
            </button>
          </div>
        </div>

        {/* The page: clearly bounded so it reads as somewhere to write. */}
        <div className="card overflow-hidden transition focus-within:border-lamp/40 focus-within:ring-4 focus-within:ring-lamp/10">
          <label className="block border-b border-white/[0.06] px-5 pt-4 pb-3 sm:px-7">
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
              className="mt-2 w-full bg-transparent font-serif text-3xl leading-tight tracking-tight text-ink-100 caret-lamp outline-none placeholder:text-ink-400 sm:text-4xl"
            />
          </label>
          <label className="block cursor-text px-5 pt-4 pb-6 sm:px-7">
            <span className="eyebrow">What I understood — in my own words</span>
            <AutoTextarea
              ref={bodyRef}
              value={draft.understanding}
              onChange={(e) => update({ understanding: e.target.value })}
              minRows={9}
              placeholder={"Explain it like you'd tell a friend.\n\nNo copy-pasting — what do you actually understand? Where does it get fuzzy?"}
              className="mt-2 w-full bg-transparent font-serif text-[1.15rem] leading-[1.8] text-ink-100 caret-lamp outline-none placeholder:text-ink-400"
            />
          </label>
        </div>

        {/* Sources */}
        <div className="mt-8 border-t border-white/[0.06] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Sources {draft.citations.length > 0 && `· ${draft.citations.length}`}</span>
            {!addingSource && (
              <button onClick={() => setAddingSource(true)} className="btn-ghost h-7 px-2 text-xs">
                <Plus className="size-3.5" /> Add source
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.citations.map((c, i) => (
              <span key={i} className="chip max-w-full py-1 pr-1">
                <span className="font-semibold text-lamp">{i + 1}</span>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="truncate hover:text-ink-100">
                    {c.label || c.url}
                  </a>
                ) : (
                  <span className="truncate">{c.label}</span>
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
            {!draft.citations.length && !addingSource && (
              <p className="text-sm text-ink-500">Optional — books, articles, videos, courses you learned from.</p>
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

        {/* Action bar */}
        <div className="sticky bottom-24 z-30 mt-10 md:bottom-4">
          <div className="card flex flex-wrap items-center gap-2 bg-ink-900/95 p-2 shadow-2xl shadow-black/50 sm:pl-4">
            <span className="mr-auto hidden text-xs text-ink-400 tabular-nums sm:inline">
              {words} words
              {reviewStale && <span className="ml-2 text-warn">· edited since review</span>}
            </span>
            <button onClick={runReview} disabled={!canReview} className="btn-soft flex-1 sm:flex-none" title="⌘↵">
              <Sparkles className="size-4 text-lamp" />
              {draft.review ? "Re-review" : "Review"}
            </button>
            <button onClick={runCompose} disabled={!draft.title.trim() || !draft.understanding.trim() || !!busy} className="btn-soft flex-1 sm:flex-none">
              <Feather className="size-4 text-lamp" />
              {draft.finalNote ? "Rewrite" : <span>Write<span className="hidden sm:inline"> in my voice</span></span>}
            </button>
            <button onClick={save} disabled={!draft.title.trim() || !draft.understanding.trim() || !!busy} className="btn-primary flex-1 sm:flex-none" title="⌘S">
              <Check className="size-4" strokeWidth={2.5} />
              Save
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
      <aside className="min-w-0 xl:sticky xl:top-14 xl:max-h-[calc(100dvh-4.5rem)] xl:self-start">
        <div className="card flex h-full flex-col overflow-hidden">
          <div className="flex gap-1 border-b border-white/[0.06] p-1.5">
            {(
              [
                ["review", "Review", Sparkles],
                ["final", "Final note", FileText],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition ${
                  panel === key ? "text-ink-100" : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {panel === key && (
                  <motion.span layoutId="panel-tab" className="absolute inset-0 rounded-xl bg-white/[0.06]" />
                )}
                <Icon className="relative size-4" />
                <span className="relative">{label}</span>
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
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-lamp/10 text-lamp">
          <Feather className="size-5" />
        </div>
        <p className="font-medium">Your note, in your voice</p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-400">
          Gemini rewrites your understanding the way you write — with every correction from the review folded in.
          Teach it your voice on the <span className="text-ink-200">My voice</span> page.
        </p>
        <button onClick={props.onCompose} disabled={!props.canCompose} className="btn-primary mt-5">
          <Feather className="size-4" /> Write in my voice
        </button>
      </div>
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
