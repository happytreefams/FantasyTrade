import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the NextAuth config: no Prisma/bcrypt imports here,
// so this can be bundled into middleware (Edge runtime) without pulling in
// Node-only dependencies. The full config (with the Credentials provider and
// Prisma adapter) lives in auth.ts and is only used on the server.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  // Auth.js auto-enables this when it sees `process.env.VERCEL` (set on every
  // Vercel deployment), so this is redundant there — set explicitly anyway so
  // trust doesn't silently depend on which platform env vars happen to be
  // present. Safe here specifically because NEXTAUTH_URL is always set to
  // our own known domain (see env.ts) — trustHost only matters for how
  // X-Forwarded-Host is interpreted, and we're not relying on an untrusted
  // request header to determine that host.
  trustHost: true,
  // Secure, __Host-/__Secure--prefixed cookies are Auth.js's default whenever
  // it detects an https:// URL (NEXTAUTH_URL in production) — nothing to set
  // explicitly here; see DEPLOYMENT.md for the one thing that does need to be
  // set correctly (NEXTAUTH_URL itself, to the final custom domain).
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "STUDENT";
      }
      // Lets a client-side `useSession().update({ role: "TEACHER" })` call
      // refresh the JWT's role claim immediately after `createGroup`
      // promotes a STUDENT to TEACHER — the claim otherwise only refreshes
      // at the next sign-in (see ARCHITECTURE.md), which would strand a
      // brand-new teacher outside their own group's dashboard for the rest
      // of the session that created it.
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role | undefined) ?? "STUDENT";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
