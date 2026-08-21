import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { accountPath, isAccountPath, isPasswordExpired, parsePasswordDays } from "@/lib/password-policy";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard") && role === "viewer") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }

    const expired = isPasswordExpired(token?.passwordChangedAt, parsePasswordDays(token?.passwordDays));
    if (expired && !isAccountPath(path)) {
      const dest = new URL(accountPath(role), req.url);
      dest.searchParams.set("expired", "1");
      return NextResponse.redirect(dest);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/status") || path.startsWith("/api/agent") || path.startsWith("/api/auth")) {
          return true;
        }
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/admin/:path*", "/portal", "/dashboard", "/admin"],
};
