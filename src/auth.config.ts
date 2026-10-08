import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,    // Refresh every 24 hours (session rotation)
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;

      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin");
      const isAppRoute = nextUrl.pathname.startsWith("/dashboard")
        || nextUrl.pathname.startsWith("/exam")
        || nextUrl.pathname.startsWith("/profile")
        || nextUrl.pathname.startsWith("/licenses");
      const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

      // Public routes - accessible without login
      const isPublicRoute = nextUrl.pathname === "/"
        || nextUrl.pathname.startsWith("/practice")
        || nextUrl.pathname.startsWith("/feedback")
        || nextUrl.pathname.startsWith("/lesson-plans")
        || nextUrl.pathname.startsWith("/recruitment")
        || nextUrl.pathname.startsWith("/faq")
        || nextUrl.pathname.startsWith("/api/auth");

      // Allow public routes
      if (isPublicRoute) {
        return true;
      }

      // 1. If already logged in and trying to access auth pages -> Redirect to appropriate panel
      if (isAuthRoute && isLoggedIn) {
        if (userRole === "ADMIN") {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 2. Protect admin routes (only ADMIN role allowed)
      if (isAdminRoute || isApiAdminRoute) {
        if (!isLoggedIn) return false; // Redirect to login
        if (userRole !== "ADMIN") return false; // Redirect to login
        return true;
      }

      // 3. Protect app routes (requires login)
      if (isAppRoute) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.licenseExpiresAt = user.licenseExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "TEACHER" | "LEARNER";
        session.user.status = token.status as "ACTIVE" | "LOCKED" | "INACTIVE";
        session.user.licenseExpiresAt = token.licenseExpiresAt as Date | string | null;
      }
      return session;
    }
  },
  providers: [], // Actual providers will be defined in auth.ts
} satisfies NextAuthConfig;
