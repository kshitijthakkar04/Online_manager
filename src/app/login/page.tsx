"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Lock } from "lucide-react";
import { LogoMark } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.replace("/");
    else setError((await res.json().catch(() => ({}))).error ?? "Wrong passcode");
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center">
        <div className="relative flex h-[38px] items-center gap-2 rounded-b-[18px] bg-black px-5 text-[13px] font-medium">
          <span className="notch-ear left" />
          <span className="notch-ear right" />
          <Lock className="size-4 text-lamp" /> Locked
        </div>
      </div>
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-14 drop-shadow-[0_10px_30px_rgb(244_183_99/0.45)]" />
          <h1 className="mt-6 font-serif text-[2.2rem] leading-tight tracking-[-0.015em]">Knowledge Diary</h1>
          <p className="mt-2 text-sm text-ink-400">Enter your passcode to open your diary.</p>
        </div>
        <div className="card p-2">
          <div className="flex gap-2">
            <input
              type="password"
              autoFocus
              className="h-11 w-full bg-transparent px-3 text-[15px] tracking-wide text-ink-100 caret-lamp outline-none placeholder:tracking-normal placeholder:text-ink-500"
              placeholder="Passcode"
              aria-label="Passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn-primary size-11 shrink-0 rounded-xl px-0" disabled={!password || loading} aria-label="Unlock">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
        </div>
        <p className={`mt-3 h-5 text-center text-sm text-bad transition ${error ? "opacity-100" : "opacity-0"}`}>{error || " "}</p>
      </form>
    </main>
  );
}
