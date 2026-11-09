"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useImperativeHandle, useLayoutEffect, useRef } from "react";

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM-DD date. Locale and time zone are pinned so the server render
 * (Vercel, UTC, en-US) matches the browser's — otherwise React hydration fails.
 */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function scoreTone(score: number) {
  if (score >= 8) return { text: "text-good", bg: "bg-good", stroke: "var(--color-good)" };
  if (score >= 5) return { text: "text-warn", bg: "bg-warn", stroke: "var(--color-warn)" };
  return { text: "text-bad", bg: "bg-bad", stroke: "var(--color-bad)" };
}

export function ScoreRing({ value, size = 76 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 10)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-semibold tracking-tight tabular-nums ${tone.text}`} style={{ fontSize: size * 0.26 }}>
          {value.toFixed(1)}
        </span>
        <span className="mt-1 text-[10px] font-medium text-ink-500">/ 10</span>
      </div>
    </div>
  );
}

export function ScoreBadge({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-0.5 text-xs font-medium tabular-nums ${tone.text}`}>
      <span className={`size-1.5 rounded-full ${tone.bg}`} />
      {value.toFixed(1)}
    </span>
  );
}

/** Textarea that grows with its content. */
export function AutoTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number; ref?: React.Ref<HTMLTextAreaElement> },
) {
  const { minRows = 3, className, ref: outerRef, ...rest } = props;
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(outerRef, () => ref.current!);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={minRows} className={`resize-none overflow-hidden ${className ?? ""}`} {...rest} />;
}

/**
 * Markdown with numbered citations. `[n]` markers become chips; `cite(n)` decides
 * where each one points (a note in your library, or a source URL).
 */
export function Markdown({
  children,
  cite,
  className = "",
}: {
  children: string;
  cite?: (n: number) => { href?: string; title: string } | null;
  className?: string;
}) {
  const text = cite ? children.replace(/\[(\d+)\](?!\(|:)/g, "[$1](#cite-$1)") : children;
  return (
    <div className={`prose prose-diary max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const m = href?.match(/^#cite-(\d+)$/);
            if (m && cite) {
              const n = Number(m[1]);
              const target = cite(n);
              const chip = (
                <span className="mx-0.5 inline-grid h-[1.3em] min-w-[1.3em] -translate-y-[0.1em] place-items-center rounded-md bg-lamp/15 px-1 align-middle font-sans text-[0.68em] font-semibold text-lamp no-underline transition hover:bg-lamp hover:text-ink-950">
                  {n}
                </span>
              );
              if (!target?.href) return <span title={target?.title}>{chip}</span>;
              return target.href.startsWith("/") ? (
                <Link href={target.href} title={target.title} className="no-underline">
                  {chip}
                </Link>
              ) : (
                <a href={target.href} title={target.title} target="_blank" rel="noreferrer" className="no-underline">
                  {chip}
                </a>
              );
            }
            return (
              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-5 grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.01] text-lamp shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
        <span className="absolute inset-0 -z-10 rounded-2xl bg-lamp/20 blur-xl" />
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-ink-100">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-400">{children}</div>}
    </div>
  );
}
