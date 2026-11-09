"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { AlertTriangle, ArrowDown, ChevronDown, CircleHelp, Puzzle, Sparkles, ThumbsUp } from "lucide-react";
import { EmptyState, ScoreRing, scoreTone } from "./ui";
import type { Review } from "@/lib/types";

export function ReviewPanel({ review, loading, stale }: { review: Review | null; loading?: boolean; stale?: boolean }) {
  if (loading) return <ReviewSkeleton />;
  if (!review) {
    return (
      <EmptyState icon={<Sparkles className="size-5" />} title="Get an honest review">
        Write what you understood, then hit <span className="text-ink-200">Review</span>. Gemini scores your
        understanding, framing and accuracy — and pushes back where you&apos;re wrong.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6 p-5">
      {stale && (
        <div className="flex items-center gap-2 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertTriangle className="size-3.5 shrink-0" />
          You&apos;ve edited since this review. Re-review to update the scores.
        </div>
      )}

      <div className="flex items-center gap-4">
        <ScoreRing value={review.overall} />
        <div>
          <p className="eyebrow">Overall</p>
          <p className="mt-1 font-serif text-[1.05rem] leading-snug text-ink-100">{review.verdict}</p>
        </div>
      </div>

      <div className="space-y-3">
        {review.scores.map((s, i) => {
          const tone = scoreTone(s.score);
          return (
            <div key={s.parameter} className="group">
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="text-ink-200">{s.parameter}</span>
                <span className={`font-medium tabular-nums ${tone.text}`}>{s.score.toFixed(1)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className={`h-full rounded-full ${tone.bg}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.score * 10}%` }}
                  transition={{ delay: i * 0.06, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                />
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{s.comment}</p>
            </div>
          );
        })}
      </div>

      {review.pushback.length > 0 && (
        <Section icon={<AlertTriangle className="size-3.5 text-bad" />} title={`Pushback · ${review.pushback.length}`}>
          <div className="space-y-3">
            {review.pushback.map((p, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-950/50">
                <div className="flex items-start gap-2 border-b border-white/[0.05] bg-bad/[0.06] px-3.5 py-2.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-px text-[10px] font-semibold uppercase ${
                      p.severity === "major" ? "bg-bad/20 text-bad" : "bg-warn/15 text-warn"
                    }`}
                  >
                    {p.severity}
                  </span>
                  <p className="font-serif text-[0.95rem] text-ink-200 italic decoration-bad/50 decoration-1 line-through">
                    “{p.quote}”
                  </p>
                </div>
                <div className="space-y-2 px-3.5 py-3 text-[13px] leading-relaxed">
                  <p className="text-ink-300">{p.issue}</p>
                  <div className="flex gap-2 rounded-lg bg-good/[0.07] px-3 py-2 text-ink-100">
                    <ArrowDown className="mt-0.5 size-3.5 shrink-0 text-good" />
                    <span>{p.correction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {review.strengths.length > 0 && (
        <Section icon={<ThumbsUp className="size-3.5 text-good" />} title="What you got right">
          <List items={review.strengths} />
        </Section>
      )}

      {review.gaps.length > 0 && (
        <Section icon={<Puzzle className="size-3.5 text-warn" />} title="Missing pieces">
          <List items={review.gaps} />
        </Section>
      )}

      {review.questions.length > 0 && <Questions items={review.questions} />}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2.5 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-300">
          <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink-500" />
          {s}
        </li>
      ))}
    </ul>
  );
}

function Questions({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3.5 py-3 text-left">
        <CircleHelp className="size-4 text-lamp" />
        <span className="flex-1 text-sm font-medium">Test yourself</span>
        <ChevronDown className={`size-4 text-ink-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="space-y-2 px-3.5 pb-3.5">
          {items.map((q, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-300">
              <span className="font-semibold text-lamp tabular-nums">{i + 1}.</span>
              {q}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-5">
      <div className="flex items-center gap-4">
        <div className="size-[76px] rounded-full bg-white/[0.05]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-white/[0.05]" />
          <div className="h-4 w-full rounded bg-white/[0.05]" />
          <div className="h-4 w-2/3 rounded bg-white/[0.05]" />
        </div>
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-28 rounded bg-white/[0.05]" />
          <div className="h-1.5 w-full rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}
