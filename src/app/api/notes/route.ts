import { errorResponse } from "@/lib/env";
import { listNotes, saveNote } from "@/lib/supabase";
import type { NoteInput } from "@/lib/types";

export async function GET() {
  try {
    return Response.json(await listNotes());
  } catch (err) {
    return errorResponse(err);
  }
}

/** Creates or updates a note. Postgres keeps its search index current via trigger. */
export async function POST(req: Request) {
  try {
    const input = (await req.json()) as NoteInput;
    if (!input.title?.trim() || !input.raw_understanding?.trim()) {
      return Response.json({ error: "Title and understanding are required" }, { status: 400 });
    }
    const note = await saveNote(input);
    return Response.json({ id: note.id });
  } catch (err) {
    return errorResponse(err);
  }
}
