import { errorResponse } from "@/lib/env";
import { getStyle, saveStyle, type StyleSettings } from "@/lib/supabase";

export async function GET() {
  try {
    return Response.json(await getStyle());
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const { style_samples, style_profile } = (await req.json()) as StyleSettings;
    await saveStyle({ style_samples: style_samples ?? "", style_profile: style_profile ?? "" });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
