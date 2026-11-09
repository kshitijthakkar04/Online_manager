"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Lock } from "lucide-react";

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
      <form onSubmit={submit} className="card w-full max-w-sm p-7">
        <p className="font-serif text-3xl tracking-tight">Knowledge Diary</p>
        <p className="mt-1 text-sm text-ink-400">Enter your passcode to open your diary.</p>
        <div className="mt-6 flex gap-2">
          <input
            type="password"
            autoFocus
            className="field h-10"
            placeholder="Passcode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn-primary size-10 shrink-0 px-0" disabled={!password || loading} aria-label="Unlock">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      </form>
    </main>
  );
}
