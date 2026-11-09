"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flame, Gauge, PenLine, Search } from "lucide-react";
import { EmptyState, ScoreBadge, formatDate, todayISO } from "./ui";
import type { NoteSummary } from "@/lib/types";

const WEEKS = 20;

function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LibraryView({ notes }: { notes: NoteSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  // "Today" is the viewer's local date, which the server can't know; fill it in after hydration.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);

  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.entry_date, (m.get(n.entry_date) ?? 0) + 1);
    return m;
  }, [notes]);

  const stats = useMemo(() => {
    if (!today) return { streak: null, avg: null };
    // A streak survives until the end of today, so start from yesterday if today is still blank.
    let day = perDay.has(today) ? today : shiftDays(today, -1);
    let streak = 0;
    while (perDay.has(day)) {
      streak++;
      day = shiftDays(day, -1);
    }
    const scored = notes.filter((n) => n.overall_score !== null);
    const avg = scored.length ? scored.reduce((s, n) => s + (n.overall_score ?? 0), 0) / scored.length : null;
    return { streak, avg };
  }, [notes, perDay, today]);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (!tag || n.tags.includes(tag)) &&
        (!q || n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q))),
    );
  }, [notes, query, tag]);

  const months = useMemo(() => {
    const groups = new Map<string, NoteSummary[]>();
    for (const n of filtered) {
      const key = n.entry_date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), n]);
    }
    return [...groups.entries()];
  }, [filtered]);

  if (!notes.length) {
    return (
      <div className="mx-auto mt-16 max-w-md">
        <EmptyState icon={<BookOpen className="size-5" />} title="Your library is empty">
          Every entry you save lands here — scored, searchable and ready for Ask.
          <div className="mt-5">
            <Link href="/" className="btn-primary">
              <PenLine className="size-4" /> Write today&apos;s entry
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">Everything you&apos;ve learned</h1>
        </div>
        <div className="flex gap-2">
          <Stat icon={<BookOpen className="size-4" />} label="Notes" value={notes.length} />
          <Stat icon={<Flame className="size-4" />} label="Day streak" value={stats.streak ?? "–"} />
          {stats.avg !== null && <Stat icon={<Gauge className="size-4" />} label="Avg score" value={stats.avg.toFixed(1)} />}
        </div>
      </header>

      {today ? <Heatmap perDay={perDay} today={today} /> : <div className="card h-[150px]" />}

      <div className="sticky top-12 z-20 -mx-2 mt-8 mb-6 bg-ink-950/80 px-2 py-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title, text or tag…  (ask questions on the Ask page)"
            className="field h-11 pl-10 text-[15px]"
          />
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map(([t, c]) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`chip transition ${tag === t ? "border-lamp/40 bg-lamp/15 text-lamp" : "hover:text-ink-100"}`}
              >
                #{t} <span className="text-ink-500">{c}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {months.length === 0 && <p className="py-12 text-center text-sm text-ink-400">Nothing matches that filter.</p>}

      <div className="space-y-10">
        {months.map(([month, items]) => (
          <section key={month}>
            <h2 className="eyebrow mb-3">{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</h2>
            <div className="grid gap-3">
              {items.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Link
                    href={`/notes/${n.id}`}
                    className="card group flex gap-5 p-5 transition hover:border-white/[0.12] hover:bg-ink-850/80"
                  >
                    <div className="w-12 shrink-0 text-center">
                      <p className="font-serif text-3xl leading-none text-ink-100">{formatDate(n.entry_date, { day: "numeric" })}</p>
                      <p className="mt-1 text-[11px] font-medium text-ink-500 uppercase">
                        {formatDate(n.entry_date, { weekday: "short" })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif text-xl leading-snug text-ink-100 transition group-hover:text-lamp">{n.title}</h3>
                        {n.overall_score !== null && <ScoreBadge value={n.overall_score} />}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-400">{n.excerpt}</p>
                      {n.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {n.tags.map((t) => (
                            <span key={t} className="text-xs text-ink-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-2.5">
      <span className="text-lamp">{icon}</span>
      <div>
        <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] text-ink-400">{label}</p>
      </div>
    </div>
  );
}

function Heatmap({ perDay, today }: { perDay: Map<string, number>; today: string }) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = shiftDays(today, -(WEEKS - 1) * 7 - dow);
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = shiftDays(start, w * 7 + d);
      return { date, count: date > today ? -1 : (perDay.get(date) ?? 0) };
    }),
  );
  const shade = (c: number) =>
    c < 0 ? "bg-transparent" : c === 0 ? "bg-white/[0.04]" : c === 1 ? "bg-lamp/40" : c === 2 ? "bg-lamp/70" : "bg-lamp";

  return (
    <div className="card overflow-x-auto p-5">
      <div className="flex min-w-max items-end justify-between gap-6">
        <div className="flex gap-[5px]">
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-[5px]">
              {week.map((d) => (
                <div
                  key={d.date}
                  title={d.count >= 0 ? `${formatDate(d.date)} — ${d.count} note${d.count === 1 ? "" : "s"}` : undefined}
                  className={`size-3.5 rounded-[4px] ${shade(d.count)} ${d.date === today ? "ring-1 ring-lamp/60" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm text-ink-200">Last {WEEKS} weeks</p>
          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-ink-500">
            Less
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className={`size-3 rounded-[3px] ${shade(c)}`} />
            ))}
            More
          </div>
        </div>
      </div>
    </div>
  );
}
