import { errorResponse } from "@/lib/env";
import { composeStream } from "@/lib/gemini";
import { getStyle } from "@/lib/supabase";
import type { Citation, Review } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title: string;
      understanding: string;
      citations: Citation[];
      review: Review | null;
    };
    const style = await getStyle();
    const stream = await composeStream({
      ...body,
      citations: body.citations ?? [],
      styleSamples: style.style_samples,
      styleProfile: style.style_profile,
    });
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
            }
          } catch (err) {
            controller.error(err);
            return;
          }
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
