import { KeyRound, TriangleAlert } from "lucide-react";
import { ConfigError } from "@/lib/env";

export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-lamp/10 text-lamp">
        <KeyRound className="size-5" />
      </div>
      <h2 className="text-lg font-semibold">Almost there — connect your services</h2>
      <p className="mt-1.5 text-sm text-ink-400">
        Add these to <code className="text-ink-200">.env.local</code> (or your Vercel project&apos;s environment variables),
        then restart / redeploy. See the README for step-by-step setup.
      </p>
      <ul className="mt-5 space-y-1.5">
        {missing.map((m) => (
          <li key={m} className="rounded-lg bg-ink-950/60 px-3 py-2 font-mono text-[13px] text-ink-200">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows the real reason a server page failed (the app is passcode-locked, so this only reaches you). */
export function LoadError({ error }: { error: unknown }) {
  if (error instanceof ConfigError) return <SetupNotice missing={error.missing} />;
  console.error(error);
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-bad/10 text-bad">
        <TriangleAlert className="size-5" />
      </div>
      <h2 className="text-lg font-semibold">Couldn&apos;t load your notes</h2>
      <p className="mt-3 rounded-lg bg-ink-950/60 px-3 py-2 font-mono text-[13px] break-words text-ink-200">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <p className="mt-3 text-sm text-ink-400">
        Usually this means <code className="text-ink-200">SUPABASE_URL</code> or the secret key is wrong, or{" "}
        <code className="text-ink-200">supabase/schema.sql</code> hasn&apos;t been run yet.
      </p>
    </div>
  );
}
