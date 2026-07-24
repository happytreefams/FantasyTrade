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
