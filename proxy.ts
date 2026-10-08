import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./lib/auth";

const protectedPrefixes = ["/dashboard", "/companies", "/tasks", "/leads", "/admin"];
const apiPrefixes = ["/api"];
const stateChangingMethods = new Set(["POST","PUT","PATCH","DELETE"]);

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPath = protectedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  const apiPath = apiPrefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  const publicApi = path === "/api/auth/login";

  if (publicApi) return NextResponse.next();
  if (!protectedPath && !apiPath) return NextResponse.next();

  if (apiPath && stateChangingMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "CSRF_ORIGIN_REJECTED" }, { status: 403 });
    }
  }

  const session = request.cookies.get("fleur_session")?.value;
  if (session && verifySessionToken(session)) return NextResponse.next();
  if (apiPath) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/companies/:path*", "/tasks/:path*", "/leads/:path*", "/admin/:path*", "/api/:path*"],
};
