import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth;

export async function middleware(req: NextRequest) {
  return (auth as any)(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/licenses/:path*",
    "/exam/:path*",
    "/login",
    "/register",
  ],
};
