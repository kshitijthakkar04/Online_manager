import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, sessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Locked" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
