import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-auth-secret-key-32charsmin",
  trustHost: true,
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
        if (userRole === "ADMIN" || userRole === "TEACHER") {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 2. Protect Admin and Staff routes
      if (isAdminRoute || isApiAdminRoute) {
        if (!isLoggedIn) return false; // Redirect to login

        // LEARNER (Customer) is strictly forbidden from any admin area
        if (userRole === "LEARNER" || !userRole) {
          return false;
        }

        // TEACHER (Staff) is allowed in admin areas (users, evaluate, questions, exams, etc.)
        // but strictly forbidden from core system settings and license generation
        const isCoreSettingsRoute =
          nextUrl.pathname.startsWith("/admin/settings") ||
          nextUrl.pathname.startsWith("/admin/licenses") ||
          nextUrl.pathname.startsWith("/api/admin/settings") ||
          nextUrl.pathname.startsWith("/api/admin/licenses");

        if (userRole === "TEACHER" && isCoreSettingsRoute) {
          if (isApiAdminRoute) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "FORBIDDEN",
                message: "Nhân viên không có quyền truy cập cấu hình hệ thống hoặc quản lý bản quyền License.",
              }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
          return Response.redirect(new URL("/admin", nextUrl));
        }

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
        token.id = user.id || token.id || token.sub;
        token.email = user.email || token.email;
        token.name = user.name || token.name;
        token.role = user.role || token.role || "LEARNER";
        token.status = user.status || token.status || "ACTIVE";
        token.licenseExpiresAt = user.licenseExpiresAt ?? token.licenseExpiresAt ?? null;
        token.reviewQuotaTotal =
          typeof user.reviewQuotaTotal === "number"
            ? user.reviewQuotaTotal
            : (token.role === "ADMIN" ? 999999 : (token.role === "TEACHER" ? 50 : 0));
        token.reviewQuotaUsed =
          typeof user.reviewQuotaUsed === "number"
            ? user.reviewQuotaUsed
            : (token.reviewQuotaUsed ?? 0);
        token.tokensUsed =
          typeof user.tokensUsed === "number"
            ? user.tokensUsed
            : (token.tokensUsed ?? 0);
      }

      // Ensure fallbacks for existing tokens
      if (!token.role) token.role = "LEARNER";
      if (!token.status) token.status = "ACTIVE";

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = (token.role as "ADMIN" | "TEACHER" | "LEARNER") || "LEARNER";
        session.user.status = (token.status as "ACTIVE" | "LOCKED" | "INACTIVE") || "ACTIVE";
        session.user.licenseExpiresAt = (token.licenseExpiresAt as Date | string | null) || null;
        session.user.reviewQuotaTotal =
          typeof token.reviewQuotaTotal === "number"
            ? token.reviewQuotaTotal
            : (session.user.role === "ADMIN" ? 999999 : (session.user.role === "TEACHER" ? 50 : 0));
        session.user.reviewQuotaUsed =
          typeof token.reviewQuotaUsed === "number" ? token.reviewQuotaUsed : 0;
        session.user.tokensUsed =
          typeof token.tokensUsed === "number" ? token.tokensUsed : 0;
      }
      return session;
    }
  },
  providers: [], // Providers defined in auth.ts
} satisfies NextAuthConfig;
