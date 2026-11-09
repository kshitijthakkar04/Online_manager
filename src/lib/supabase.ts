import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import type { Note, NoteInput, NoteSummary } from "./types";

let client: SupabaseClient | null = null;

// Everything except the `search` tsvector, which is only used inside Postgres.
const NOTE_COLUMNS =
  "id, entry_date, title, raw_understanding, final_note, citations, review, tags, overall_score, created_at, updated_at";

function db() {
  if (!client) {
    const env = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
    // Accept the dashboard's "Data API" URL too: the client appends /rest/v1 itself.
    const url = env.SUPABASE_URL.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    client = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

type DbError = { message: string; code?: string; hint?: string | null };

function check<T>({ data, error, status }: { data: T; error: DbError | null; status?: number }): T {
  if (error) {
    const detail = [error.message, error.code && `code ${error.code}`, error.hint, status && `HTTP ${status}`]
      .filter(Boolean)
      .join(" · ");
    throw new Error(`Supabase: ${detail || "request failed"}`);
  }
  return data;
}

function excerpt(text: string, len = 220) {
  const plain = text.replace(/[#>*_`\[\]()-]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

export async function listNotes(): Promise<NoteSummary[]> {
  const rows = check(
    await db()
      .from("notes")
      .select("id, entry_date, title, tags, overall_score, created_at, final_note, raw_understanding")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
  );
  return (rows ?? []).map(({ final_note, raw_understanding, ...rest }) => ({
    ...rest,
    overall_score: rest.overall_score === null ? null : Number(rest.overall_score),
    excerpt: excerpt(final_note || raw_understanding),
  }));
}

export async function getNote(id: string): Promise<Note | null> {
  const row = check(await db().from("notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle<Note>());
  return row ? { ...row, overall_score: row.overall_score === null ? null : Number(row.overall_score) } : null;
}

export async function getNotesByIds(ids: string[]): Promise<Note[]> {
  if (!ids.length) return [];
  return check(await db().from("notes").select(NOTE_COLUMNS).in("id", ids)) ?? [];
}

export async function saveNote(input: NoteInput): Promise<Note> {
  const row = {
    entry_date: input.entry_date,
    title: input.title.trim(),
    raw_understanding: input.raw_understanding,
    final_note: input.final_note?.trim() || null,
    citations: input.citations.filter((c) => c.label.trim() || c.url?.trim()),
    review: input.review,
    tags: input.review?.tags ?? [],
    overall_score: input.review?.overall ?? null,
  };
  const query = input.id
    ? db().from("notes").update(row).eq("id", input.id)
    : db().from("notes").insert(row);
  const note = check(await query.select(NOTE_COLUMNS).single<Note>());
  if (!note) throw new Error("Note not found");
  return note;
}

export type SearchHit = { id: string; title: string; entry_date: string; rank: number; snippet: string };

/** Ranked keyword search (Postgres full-text, see `search_notes` in supabase/schema.sql). */
export async function searchNotes(opts: {
  keywords: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
}): Promise<SearchHit[]> {
  const hits = check(
    await db().rpc("search_notes", {
      q: opts.keywords,
      date_from: opts.dateFrom || null,
      date_to: opts.dateTo || null,
      max_results: opts.limit ?? 6,
    }),
  ) as SearchHit[] | null;
  return (hits ?? []).map((h) => ({ ...h, snippet: h.snippet.replace(/<\/?b>|[*_`#>]/g, "") }));
}

export async function recentNotes(limit = 5): Promise<Note[]> {
  return (
    check(
      await db()
        .from("notes")
        .select(NOTE_COLUMNS)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    ) ?? []
  );
}

export async function deleteNote(id: string) {
  check(await db().from("notes").delete().eq("id", id));
}

export type StyleSettings = { style_samples: string; style_profile: string };

export async function getStyle(): Promise<StyleSettings> {
  const row = check(
    await db().from("settings").select("style_samples, style_profile").eq("id", 1).maybeSingle(),
  );
  return row ?? { style_samples: "", style_profile: "" };
}

export async function saveStyle(style: StyleSettings) {
  check(await db().from("settings").upsert({ id: 1, ...style }));
}
