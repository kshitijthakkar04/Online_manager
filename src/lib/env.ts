import "server-only";

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export function requireEnv<K extends string>(...keys: K[]): Record<K, string> {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) throw new ConfigError(missing);
  return Object.fromEntries(keys.map((k) => [k, process.env[k]!])) as Record<K, string>;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

/** Turns any thrown error into a JSON response the client can show in the notch. */
export function errorResponse(err: unknown) {
  if (err instanceof ConfigError) {
    return Response.json({ error: err.message, missing: err.missing }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Something went wrong";
  console.error(err);
  return Response.json({ error: message }, { status: 500 });
}
