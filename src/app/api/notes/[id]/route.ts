import { errorResponse } from "@/lib/env";
import { deleteNote, getNote } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const note = await getNote((await params).id);
    return note ? Response.json(note) : Response.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await deleteNote((await params).id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
