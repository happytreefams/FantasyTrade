import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const AUTH_PAGES = ["/login", "/signup"];
// `/api/cron/*` authenticates itself via CRON_SECRET (see `@/lib/cron-auth`)
// — Vercel's scheduler and the health monitor hitting `/api/health` have no
// session cookie, so both must bypass the login redirect below or every
// scheduled/monitored request would 302 to /login instead of ever reaching
// the route handler.
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/signup", "/api/cron", "/api/health"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  // Coarse redirect only — `/teacher` itself (no groupId) stays open to any
  // signed-in user, since a STUDENT becomes a TEACHER by creating their
  // first classroom there (see `@/lib/groups`'s `createGroup`). Only the
  // per-group dashboard requires the role; page-level `requireGroupTeacher`
  // additionally checks the caller actually teaches that specific group.
  const isTeacherRole = req.auth?.user?.role === "TEACHER" || req.auth?.user?.role === "ADMIN";
  if (pathname.startsWith("/teacher/") && !isTeacherRole) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
