import { NextRequest, NextResponse } from "next/server";

function computeSessionToken(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  return btoa(`${password}:${secret}`);
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Auth routes and login page — always allow
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Cron routes — validate Bearer token
  if (pathname.startsWith("/api/cron")) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Other API routes — validate x-api-key
  if (pathname.startsWith("/api")) {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Dashboard routes — validate session cookie
  if (pathname.startsWith("/dashboard") || pathname === "/") {
    const sessionCookie = req.cookies.get("rb_session")?.value;
    const expected = computeSessionToken();
    if (!sessionCookie || sessionCookie !== expected) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/login", "/"],
};
