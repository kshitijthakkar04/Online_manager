"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNotch } from "./notch";

// Fixed (not random) so the server and browser render identical markup.
const GLYPHS = [
  { c: "∑", dx: -70, rot: -25, delay: 0, dur: 3.4, size: 26 },
  { c: "π", dx: 55, rot: 30, delay: 0.5, dur: 3.0, size: 22 },
  { c: "λ", dx: -20, rot: 15, delay: 1.1, dur: 3.6, size: 24 },
  { c: "∞", dx: 90, rot: -20, delay: 1.6, dur: 3.2, size: 20 },
  { c: "a", dx: -105, rot: 35, delay: 2.0, dur: 3.8, size: 22 },
  { c: "√", dx: 25, rot: -35, delay: 2.5, dur: 3.1, size: 24 },
  { c: "Ω", dx: -45, rot: 10, delay: 0.8, dur: 3.5, size: 18 },
  { c: "θ", dx: 120, rot: 25, delay: 2.9, dur: 3.3, size: 18 },
  { c: "?", dx: -130, rot: -15, delay: 1.4, dur: 3.7, size: 20 },
  { c: "ƒ", dx: 70, rot: 40, delay: 3.3, dur: 3.4, size: 22 },
];

// Hand-drawn-ish "handwriting" strokes for each flipping page.
const INK = [
  "M0 6 C 12 2, 22 10, 34 5 S 58 2, 70 6",
  "M0 22 C 10 18, 26 26, 40 21 S 60 18, 64 22",
  "M0 38 C 14 34, 24 42, 38 37 S 56 34, 70 38",
  "M0 54 C 8 50, 20 58, 30 53",
];

const ROWS = 7;
const COLS = 18;

export function PageLoader({ notchText, messages }: { notchText: string; messages: string[] }) {
  const notch = useNotch();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = notch.busy(notchText);
    return () => notch.release(id);
  }, [notch, notchText]);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 1700);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div role="status" aria-label={notchText} className="flex min-h-[72dvh] flex-col items-center justify-center overflow-hidden py-10">
      <div className="ledger mt-10 scale-[0.85] sm:scale-100">
        <div className="ledger-glow" />
        <div className="ledger-book">
          <div className="ledger-cover left" />
          <div className="ledger-cover right" />
          <div className="ledger-page static left-stack" style={{ transform: "translateZ(1px)" }} />
          <div className="ledger-page static" style={{ transform: "translateZ(1px)" }} />
          {[0, 1, 2, 3].map((p) => (
            <div key={p} className="ledger-page" style={{ "--i": p } as React.CSSProperties}>
              <svg className="ledger-ink" viewBox="0 0 70 60" preserveAspectRatio="none">
                {INK.map((d, k) => (
                  <path key={k} d={d} style={{ animationDelay: `${p * 0.3 + k * 0.12}s` }} />
                ))}
              </svg>
            </div>
          ))}
        </div>
        {GLYPHS.map((g) => (
          <span
            key={g.c}
            className="ledger-glyph"
            style={
              {
                "--dx": `${g.dx}px`,
                "--rot": `${g.rot}deg`,
                "--delay": `${g.delay}s`,
                "--dur": `${g.dur}s`,
                fontSize: g.size,
              } as React.CSSProperties
            }
          >
            {g.c}
          </span>
        ))}
      </div>

      <div className="mt-16 h-7 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.35 }}
            className="font-serif text-xl text-ink-100 italic"
          >
            {messages[i]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-6 grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${COLS}, 10px)` }} aria-hidden>
        {Array.from({ length: ROWS * COLS }, (_, k) => {
          const row = Math.floor(k / COLS);
          const col = k % COLS;
          return (
            <span
              key={k}
              className="ledger-wave size-[10px] rounded-[3px]"
              style={{ "--d": `${(col + row) * 0.07}s` } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
