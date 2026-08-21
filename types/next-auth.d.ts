import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      tenantId: string;
      tenantSlug: string;
      passwordExpired: boolean;
      passwordDaysLeft: number;
      passwordDays: number;
    };
  }

  interface User {
    role: string;
    tenantId: string;
    tenantSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
    passwordChangedAt?: string;
    passwordDays?: number;
    passwordExpired?: boolean;
    passwordDaysLeft?: number;
  }
}
