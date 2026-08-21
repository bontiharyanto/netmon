import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "viewer";
        session.user.tenantId = (token.tenantId as string) ?? "";
        session.user.tenantSlug = (token.tenantSlug as string) ?? "";
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
