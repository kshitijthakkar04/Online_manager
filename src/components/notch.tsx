"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { pageFor } from "./nav";

type Tone = "busy" | "success" | "error";
type Activity = { tone: Tone; text: string; id: number };

type NotchApi = {
  busy: (text: string) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  clear: () => void;
  setSubtitle: (text: string | null) => void;
};

const NotchContext = createContext<NotchApi | null>(null);
const StateContext = createContext<{ activity: Activity | null; subtitle: string | null }>({
  activity: null,
  subtitle: null,
});

export function useNotch() {
  const ctx = useContext(NotchContext);
  if (!ctx) throw new Error("useNotch must be used inside <NotchProvider>");
  return ctx;
}

const LINGER: Record<Tone, number | null> = { busy: null, success: 2600, error: 6000 };

export function NotchProvider({ children }: { children: React.ReactNode }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seq = useRef(0);

  const show = useCallback((tone: Tone, text: string) => {
    clearTimeout(timer.current);
    const id = ++seq.current;
    setActivity({ tone, text, id });
    const linger = LINGER[tone];
    if (linger) timer.current = setTimeout(() => setActivity((a) => (a?.id === id ? null : a)), linger);
  }, []);

  const api = useMemo<NotchApi>(
    () => ({
      busy: (t) => show("busy", t),
      success: (t) => show("success", t),
      error: (t) => show("error", t),
      clear: () => {
        clearTimeout(timer.current);
        setActivity(null);
      },
      setSubtitle,
    }),
    [show],
  );

  return (
    <NotchContext.Provider value={api}>
      <StateContext.Provider value={{ activity, subtitle }}>{children}</StateContext.Provider>
    </NotchContext.Provider>
  );
}

/** Lets a server-rendered page put context (e.g. the note title) in the notch. */
export function NotchSubtitle({ text }: { text: string }) {
  const { setSubtitle } = useNotch();
  useEffect(() => {
    setSubtitle(text);
    return () => setSubtitle(null);
  }, [text, setSubtitle]);
  return null;
}

const TONE_STYLE: Record<Tone, { icon: React.ReactNode; text: string }> = {
  busy: { icon: <LoaderCircle className="size-4 animate-spin text-lamp" />, text: "shimmer-text" },
  success: { icon: <CheckCircle2 className="size-4 text-good" />, text: "text-ink-100" },
  error: { icon: <AlertTriangle className="size-4 text-bad" />, text: "text-bad" },
};

export function Notch() {
  const { activity, subtitle } = useContext(StateContext);
  const pathname = usePathname();
  const page = pageFor(pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(150);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.ceil(el.offsetWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Page subtitles can be dates, which depend on the viewer's locale and time zone.
  // Pages are prerendered at build time, so only compute them in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sub = subtitle ?? (mounted ? page.subtitle?.() : undefined);

  const key = activity ? `a${activity.id}` : `p${pathname}${sub ?? ""}`;
  const Icon = page.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <motion.div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative h-[38px] rounded-b-[18px] bg-black shadow-[0_10px_40px_-10px_rgb(0_0_0/0.9)]"
        animate={{ width: Math.max(width, 120), height: activity ? 42 : 38 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <span className="notch-ear left" />
        <span className="notch-ear right" />
        <div className="absolute inset-0 overflow-hidden rounded-b-[18px]">
          <div ref={contentRef} className="absolute left-1/2 top-0 flex h-full w-max -translate-x-1/2 items-center px-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={key}
                initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 6, filter: "blur(4px)", transition: { duration: 0.12 } }}
                transition={{ duration: 0.22 }}
                className="flex items-center gap-2 text-[13px] font-medium whitespace-nowrap"
              >
                {activity ? (
                  <>
                    {TONE_STYLE[activity.tone].icon}
                    <span className={`max-w-[60vw] truncate sm:max-w-[420px] ${TONE_STYLE[activity.tone].text}`} title={activity.text}>
                      {activity.text}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon className="size-4 text-lamp" />
                    <span className="text-ink-100">{page.label}</span>
                    {sub && (
                      <>
                        <span className="text-ink-600">·</span>
                        <span className="max-w-[38vw] truncate text-ink-400 sm:max-w-[260px]">{sub}</span>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
