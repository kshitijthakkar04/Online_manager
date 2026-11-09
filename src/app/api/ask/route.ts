import { errorResponse } from "@/lib/env";
import { answerFromNotes, planSearch } from "@/lib/gemini";
import { getNotesByIds, recentNotes, searchNotes } from "@/lib/supabase";
import type { AskSource, ChatTurn, Note } from "@/lib/types";

export const maxDuration = 60;

// Enough of each note for Gemini to answer from without blowing up the prompt.
const NOTE_BUDGET = 5000;

function noteText(note: Note) {
  const body = note.final_note
    ? `${note.final_note}\n\nMy original notes:\n${note.raw_understanding}`
    : note.raw_understanding;
  return body.length > NOTE_BUDGET ? `${body.slice(0, NOTE_BUDGET)}…` : body;
}

export async function POST(req: Request) {
  try {
    const { question, history = [], today } = (await req.json()) as {
      question: string;
      history?: ChatTurn[];
      today?: string;
    };
    if (!question?.trim()) return Response.json({ error: "Ask something" }, { status: 400 });

    const plan = await planSearch(question, history, today ?? new Date().toISOString().slice(0, 10));
    const hits = await searchNotes({
      keywords: plan.keywords.join(" ") || question,
      dateFrom: plan.dateFrom,
      dateTo: plan.dateTo,
      limit: 6,
    });

    // Nothing matched: hand Gemini your latest notes so it can say what you *have* written about.
    const notes = hits.length ? await getNotesByIds(hits.map((h) => h.id)) : await recentNotes(5);
    const byId = new Map(notes.map((n) => [n.id, n]));
    const ordered = hits.length ? hits.map((h) => byId.get(h.id)).filter((n): n is Note => Boolean(n)) : notes;
    const snippets = new Map(hits.map((h) => [h.id, h.snippet]));

    const sources: (AskSource & { text: string })[] = ordered.map((n, i) => ({
      n: i + 1,
      noteId: n.id,
      title: n.title,
      entryDate: n.entry_date,
      snippet: (snippets.get(n.id) ?? (n.final_note || n.raw_understanding)).slice(0, 220),
      text: noteText(n),
    }));

    const answer = await answerFromNotes({ question, history, sources, matched: hits.length > 0 });

    // Only show sources the answer actually cited.
    const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    return Response.json({
      answer,
      sources: sources.filter((s) => cited.has(s.n)).map(({ text: _text, ...s }) => s),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
