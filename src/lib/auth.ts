// Shared by the proxy (edge) and the login route, so only Web Crypto here.

export const SESSION_COOKIE = "kd_session";

export const authEnabled = () => Boolean(process.env.APP_PASSWORD);

export async function sessionToken(password = process.env.APP_PASSWORD ?? "") {
  const data = new TextEncoder().encode(`${password}:${process.env.AUTH_SECRET ?? ""}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
