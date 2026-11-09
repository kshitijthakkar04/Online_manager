"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Flame, Gauge, CalendarDays, PenLine, Search, X } from "lucide-react";
import { PageHeader } from "./page-header";
import { EmptyState, ScoreBadge, formatDate, todayISO } from "./ui";
import type { NoteSummary } from "@/lib/types";

const WEEKS = 53;

function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LibraryView({ notes }: { notes: NoteSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // "Today" is the viewer's local date, which the server can't know; fill it in after hydration.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);

  // "/" focuses search, Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.entry_date, (m.get(n.entry_date) ?? 0) + 1);
    return m;
  }, [notes]);

  const avg = useMemo(() => {
    const scored = notes.filter((n) => n.overall_score !== null);
    return scored.length ? scored.reduce((s, n) => s + (n.overall_score ?? 0), 0) / scored.length : null;
  }, [notes]);

  const timeStats = useMemo(() => {
    if (!today) return null;
    // A streak survives until the end of today, so start from yesterday if today is still blank.
    let day = perDay.has(today) ? today : shiftDays(today, -1);
    let streak = 0;
    while (perDay.has(day)) {
      streak++;
      day = shiftDays(day, -1);
    }
    const weekAgo = shiftDays(today, -6);
    const thisWeek = notes.filter((n) => n.entry_date >= weekAgo && n.entry_date <= today).length;
    return { streak, thisWeek };
  }, [notes, perDay, today]);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
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
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Library" title="Everything you've learned" />
        <div className="card">
          <EmptyState icon={<BookOpen className="size-5" />} title="Your library is empty">
            Every entry you save lands here — scored, searchable and ready for Ask.
            <div className="mt-5">
              <Link href="/" className="btn-primary">
                <PenLine className="size-4" /> Write today&apos;s entry
              </Link>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  const filtering = Boolean(query.trim() || tag);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Library"
        title="Everything you've learned"
        description={`${notes.length} ${notes.length === 1 ? "entry" : "entries"} across ${tags.length} ${tags.length === 1 ? "topic" : "topics"}.`}
      >
        <Link href="/" className="btn-primary">
          <PenLine className="size-4" /> New entry
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="card grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-white/[0.06] [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-white/[0.06] [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-white/[0.06] sm:[&>*]:border-0">
        <Stat icon={<BookOpen className="size-4" />} label="Entries" value={notes.length} />
        <Stat icon={<Flame className="size-4" />} label="Day streak" value={timeStats?.streak ?? "–"} accent={Boolean(timeStats?.streak)} />
        <Stat icon={<CalendarDays className="size-4" />} label="This week" value={timeStats?.thisWeek ?? "–"} />
        <Stat icon={<Gauge className="size-4" />} label="Avg. score" value={avg === null ? "–" : avg.toFixed(1)} suffix={avg === null ? undefined : "/10"} />
      </div>

      {today ? <Heatmap perDay={perDay} today={today} /> : <div className="card mt-4 h-[178px]" />}

      {/* Filters */}
      <div className="sticky top-14 z-20 -mx-2 mt-10 mb-4 bg-ink-950/85 px-2 py-3 backdrop-blur-xl md:top-[60px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Filter by title, text or tag"
            className="field h-11 pr-12 pl-10 text-[15px]"
          />
          <span className="kbd absolute top-1/2 right-3 -translate-y-1/2">/</span>
        </div>
        {tags.length > 0 && (
          <div className="-mx-2 mt-3 flex gap-1.5 overflow-x-auto px-2 pb-1 [mask-image:linear-gradient(90deg,#000_92%,transparent)] [scrollbar-width:none]">
            {tags.map(([t, c]) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`chip shrink-0 transition ${
                  tag === t ? "border-lamp/40 bg-lamp/[0.14] text-lamp" : "hover:border-white/[0.14] hover:text-ink-100"
                }`}
              >
                {t}
                <span className={tag === t ? "text-lamp/70" : "text-ink-500"}>{c}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtering && (
        <div className="mb-4 flex items-center justify-between text-sm text-ink-400">
          <span>
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
            {tag && (
              <>
                {" "}
                in <span className="text-lamp">{tag}</span>
              </>
            )}
          </span>
          <button
            onClick={() => {
              setQuery("");
              setTag(null);
            }}
            className="btn-ghost h-7 px-2 text-xs"
          >
            <X className="size-3.5" /> Clear
          </button>
        </div>
      )}

      {months.length === 0 && (
        <div className="card">
          <EmptyState icon={<Search className="size-5" />} title="Nothing matches">
            Try another word — or ask a real question on the Ask page.
          </EmptyState>
        </div>
      )}

      <div className="space-y-8">
        {months.map(([month, items]) => (
          <section key={month}>
            <div className="mb-2.5 flex items-baseline justify-between px-1">
              <h2 className="eyebrow">{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</h2>
              <span className="text-xs text-ink-500">
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <ul className="card divide-y divide-white/[0.05] overflow-hidden">
              {items.map((n, i) => (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.035, 0.3), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/notes/${n.id}`}
                    className="group flex gap-4 px-4 py-4 transition hover:bg-white/[0.025] sm:gap-6 sm:px-6 sm:py-5"
                  >
                    <div className="w-11 shrink-0 pt-0.5 text-center">
                      <p className="font-serif text-[1.9rem] leading-none text-ink-100">
                        {formatDate(n.entry_date, { day: "numeric" })}
                      </p>
                      <p className="mt-1.5 text-[10px] font-semibold tracking-wider text-ink-500 uppercase">
                        {formatDate(n.entry_date, { weekday: "short" })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif text-[1.3rem] leading-snug tracking-[-0.005em] text-ink-100 transition group-hover:text-lamp-bright">
                          {n.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-2 pt-1">
                          {n.overall_score !== null && <ScoreBadge value={n.overall_score} />}
                          <ArrowUpRight className="hidden size-4 -translate-x-1 text-ink-500 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 sm:block" />
                        </div>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-ink-400">{n.excerpt}</p>
                      {n.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {n.tags.map((t) => (
                            <span key={t} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-ink-400">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
        <span className={accent ? "text-lamp" : "text-ink-500"}>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-[1.65rem] leading-none font-semibold tracking-tight text-ink-100 tabular-nums">
        {value}
        {suffix && <span className="ml-0.5 text-sm font-medium text-ink-500">{suffix}</span>}
      </p>
    </div>
  );
}

function Heatmap({ perDay, today }: { perDay: Map<string, number>; today: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On narrow screens, start scrolled to the most recent weeks.
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, []);

  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = shiftDays(today, -(WEEKS - 1) * 7 - dow);
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = shiftDays(start, w * 7 + d);
      return { date, count: date > today ? -1 : (perDay.get(date) ?? 0) };
    }),
  );
  // Month label above the first week that starts in a new month.
  const monthLabels = weeks.map((week, w) => {
    const m = week[0].date.slice(5, 7);
    const prev = w > 0 ? weeks[w - 1][0].date.slice(5, 7) : null;
    return m !== prev && w < WEEKS - 2 ? formatDate(week[0].date, { month: "short" }) : "";
  });
  const total = weeks.flat().reduce((s, d) => s + Math.max(d.count, 0), 0);
  const shade = (c: number) =>
    c < 0
      ? "bg-transparent"
      : c === 0
        ? "bg-white/[0.045]"
        : c === 1
          ? "bg-lamp/35"
          : c === 2
            ? "bg-lamp/65"
            : "bg-lamp shadow-[0_0_8px_rgb(244_183_99/0.5)]";

  return (
    <div className="card mt-4 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink-200">
          {total} {total === 1 ? "entry" : "entries"} <span className="text-ink-500">in the last year</span>
        </p>
        <div className="flex items-center gap-1 text-[11px] text-ink-500">
          Less
          {[0, 1, 2, 3].map((c) => (
            <span key={c} className={`size-[11px] rounded-[3px] ${shade(c)}`} />
          ))}
          More
        </div>
      </div>
      <div ref={scroller} className="overflow-x-auto pb-1 [scrollbar-width:none]">
        {/* One grid, filled column by column: a label column, then one column per week. */}
        <div
          className="grid min-w-[640px] grid-flow-col grid-rows-[14px_repeat(7,auto)] gap-[3px]"
          style={{ gridTemplateColumns: `28px repeat(${WEEKS}, minmax(0, 1fr))` }}
        >
          <span />
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <span key={i} className="self-center text-[10px] leading-none text-ink-500">
              {d}
            </span>
          ))}
          {weeks.map((week, w) => [
            <span key={`m${w}`} className="overflow-visible text-[10px] leading-[11px] whitespace-nowrap text-ink-500">
              {monthLabels[w]}
            </span>,
            ...week.map((d) => (
              <span
                key={d.date}
                title={d.count >= 0 ? `${formatDate(d.date)} · ${d.count} ${d.count === 1 ? "entry" : "entries"}` : undefined}
                className={`aspect-square w-full max-w-[16px] rounded-[3px] ${shade(d.count)} ${d.date === today ? "ring-1 ring-lamp ring-offset-1 ring-offset-ink-900" : ""}`}
              />
            )),
          ])}
        </div>
      </div>
    </div>
  );
}
