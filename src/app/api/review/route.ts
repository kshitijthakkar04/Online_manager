import { errorResponse } from "@/lib/env";
import { reviewEntry } from "@/lib/gemini";
import type { Citation } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { title, understanding, citations } = (await req.json()) as {
      title: string;
      understanding: string;
      citations: Citation[];
    };
    if (!title?.trim() || !understanding?.trim()) {
      return Response.json({ error: "Add a title and what you understood first" }, { status: 400 });
    }
    return Response.json(await reviewEntry({ title, understanding, citations: citations ?? [] }));
  } catch (err) {
    return errorResponse(err);
  }
}
