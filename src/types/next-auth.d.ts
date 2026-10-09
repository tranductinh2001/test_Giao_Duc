import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEACHER" | "LEARNER";
      status: "ACTIVE" | "LOCKED" | "INACTIVE";
      licenseExpiresAt: Date | string | null;
      reviewQuotaTotal?: number;
      reviewQuotaUsed?: number;
      tokensUsed?: number;
    } & DefaultSession["user"]
  }

  interface User {
    id?: string;
    role?: "ADMIN" | "TEACHER" | "LEARNER";
    status?: "ACTIVE" | "LOCKED" | "INACTIVE";
    licenseExpiresAt?: Date | string | null;
    reviewQuotaTotal?: number;
    reviewQuotaUsed?: number;
    tokensUsed?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "TEACHER" | "LEARNER";
    status?: "ACTIVE" | "LOCKED" | "INACTIVE";
    licenseExpiresAt?: Date | string | null;
    reviewQuotaTotal?: number;
    reviewQuotaUsed?: number;
    tokensUsed?: number;
  }
}
