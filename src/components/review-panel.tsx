"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { AlertTriangle, ChevronDown, CircleHelp, CornerDownRight, Puzzle, Sparkles, ThumbsUp } from "lucide-react";
import { EmptyState, ScoreRing, scoreTone } from "./ui";
import type { Review } from "@/lib/types";

export function ReviewPanel({ review, loading, stale }: { review: Review | null; loading?: boolean; stale?: boolean }) {
  if (loading) return <ReviewSkeleton />;
  if (!review) {
    return (
      <EmptyState icon={<Sparkles className="size-5" />} title="Get an honest review">
        Write what you understood, then hit <span className="text-ink-200">Review</span>. Gemini scores six dimensions of
        your understanding — and pushes back where you&apos;re wrong.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-7 p-5">
      {stale && (
        <div className="flex items-start gap-2 rounded-xl border border-warn/20 bg-warn/[0.07] px-3 py-2.5 text-xs leading-relaxed text-warn">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          You&apos;ve edited since this review. Re-review to update the scores.
        </div>
      )}

      <div className="flex items-center gap-4">
        <ScoreRing value={review.overall} size={84} />
        <div className="min-w-0">
          <p className="eyebrow">Overall</p>
          <p className="mt-1.5 font-serif text-[1.08rem] leading-snug text-ink-100">{review.verdict}</p>
        </div>
      </div>

      <div className="space-y-4">
        {review.scores.map((s, i) => {
          const tone = scoreTone(s.score);
          return (
            <div key={s.parameter}>
              <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-ink-200">{s.parameter}</span>
                <span className={`font-semibold tabular-nums ${tone.text}`}>{s.score.toFixed(1)}</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                {/* Tick marks at every 2 points make the scale readable at a glance. */}
                <div className="absolute inset-0 flex justify-between px-[20%]">
                  {[0, 1, 2, 3].map((t) => (
                    <span key={t} className="h-full w-px bg-ink-900/80" />
                  ))}
                </div>
                <motion.div
                  className={`relative h-full rounded-full ${tone.bg}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.score * 10}%` }}
                  transition={{ delay: i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{s.comment}</p>
            </div>
          );
        })}
      </div>

      {review.pushback.length > 0 && (
        <Section icon={<AlertTriangle className="size-3.5 text-bad" />} title="Pushback" count={review.pushback.length}>
          <div className="space-y-3">
            {review.pushback.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-ink-950/50 p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className={`rounded-md px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
                      p.severity === "major" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"
                    }`}
                  >
                    {p.severity}
                  </span>
                  <span className="text-[11px] text-ink-500">You wrote</span>
                </div>
                <p className="font-serif text-[1rem] leading-snug text-ink-200 italic underline decoration-bad/60 decoration-wavy decoration-1 underline-offset-4">
                  {p.quote}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-300">{p.issue}</p>
                <div className="mt-3 border-l-2 border-good/70 bg-good/[0.06] py-2 pr-3 pl-3 text-[13px] leading-relaxed text-ink-100">
                  <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-good uppercase">
                    <CornerDownRight className="size-3" /> Correction
                  </p>
                  {p.correction}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {review.strengths.length > 0 && (
        <Section icon={<ThumbsUp className="size-3.5 text-good" />} title="What you got right">
          <List items={review.strengths} dot="bg-good/70" />
        </Section>
      )}

      {review.gaps.length > 0 && (
        <Section icon={<Puzzle className="size-3.5 text-warn" />} title="Missing pieces">
          <List items={review.gaps} dot="bg-warn/70" />
        </Section>
      )}

      {review.questions.length > 0 && <Questions items={review.questions} />}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-3 flex items-center gap-1.5">
        {icon}
        {title}
        {count !== undefined && <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] text-ink-300">{count}</span>}
      </p>
      {children}
    </div>
  );
}

function List({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-300">
          <span className={`mt-[0.55em] size-1.5 shrink-0 rounded-full ${dot}`} />
          {s}
        </li>
      ))}
    </ul>
  );
}

function Questions({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-white/[0.02]">
        <CircleHelp className="size-4 text-lamp" />
        <span className="flex-1 text-[13px] font-medium">Test yourself</span>
        <span className="text-[11px] text-ink-500">{items.length} questions</span>
        <ChevronDown className={`size-4 text-ink-400 transition duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="space-y-2.5 border-t border-white/[0.05] px-4 py-3.5">
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
    <div className="space-y-6 p-5" aria-label="Reviewing">
      <div className="flex items-center gap-4">
        <div className="relative size-[84px] rounded-full ring-[6px] ring-white/[0.05]">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-lamp/70 [animation-duration:1.4s]" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-1.5 w-full animate-pulse rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}
