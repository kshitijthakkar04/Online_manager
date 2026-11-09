import { errorResponse } from "@/lib/env";
import { analyzeStyle } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { samples } = (await req.json()) as { samples: string };
    if (!samples?.trim() || samples.trim().length < 200) {
      return Response.json({ error: "Paste at least a few paragraphs of your writing" }, { status: 400 });
    }
    return Response.json({ profile: await analyzeStyle(samples) });
  } catch (err) {
    return errorResponse(err);
  }
}
