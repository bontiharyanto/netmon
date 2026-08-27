import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PASSWORD_DAYS,
  daysUntilPasswordExpiry,
  isPasswordExpired,
  parsePasswordDays,
} from "@/lib/password-policy";
import { sessionMaxSeconds, parseIdleMinutes } from "@/lib/idle";

const maxAge = sessionMaxSeconds();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge, updateAge: Math.min(300, Math.floor(maxAge / 12)) },
  jwt: { maxAge },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        try {
          const found = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true },
          });
          if (!found || found.tenant.status !== "active") return null;

          const valid = await bcrypt.compare(password, found.password_hash);
          if (!valid) return null;

          if (found.totp_enabled) {
            const otp = credentials?.otp ?? "";
            if (!found.totp_secret || !authenticator.check(otp, found.totp_secret)) {
              throw new Error("OTP_REQUIRED");
            }
          }

          return {
            id: found.id,
            email: found.email,
            name: found.name ?? found.email,
            role: found.role,
            tenantId: found.tenant_id,
            tenantSlug: found.tenant.slug,
          };
        } catch (error) {
          if (error instanceof Error && error.message === "OTP_REQUIRED") throw error;
          throw new Error("DATABASE_UNAVAILABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
      }

      const email = typeof token.email === "string" ? token.email.toLowerCase() : null;
      try {
        const live = email
          ? await prisma.user.findUnique({
              where: { email },
              include: {
                tenant: { select: { slug: true, status: true, password_days: true, idle_minutes: true } },
              },
            })
          : null;

        if (live?.tenant.status === "active") {
          const passwordDays = parsePasswordDays(live.tenant.password_days);
          token.sub = live.id;
          token.role = live.role;
          token.tenantId = live.tenant_id;
          token.tenantSlug = live.tenant.slug;
          token.passwordChangedAt = live.password_changed_at.toISOString();
          token.passwordDays = passwordDays;
          token.passwordExpired = isPasswordExpired(live.password_changed_at, passwordDays);
          token.passwordDaysLeft = daysUntilPasswordExpiry(live.password_changed_at, passwordDays);
          token.idleMinutes = parseIdleMinutes(live.tenant.idle_minutes);
        }
      } catch {
        // Keep the existing JWT if Postgres is briefly unreachable.
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "viewer";
        session.user.tenantId = (token.tenantId as string) ?? "";
        session.user.tenantSlug = (token.tenantSlug as string) ?? "";
        session.user.passwordExpired = Boolean(token.passwordExpired);
        session.user.passwordDaysLeft = typeof token.passwordDaysLeft === "number" ? token.passwordDaysLeft : DEFAULT_PASSWORD_DAYS;
        session.user.passwordDays = parsePasswordDays(token.passwordDays);
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getAuthSession();
  if (!session?.user?.tenantId) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
