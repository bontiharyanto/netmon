"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { accountPath } from "@/lib/password-policy";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { useI18n } from "@/components/layout/locale-provider";

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [otpNeeded, setOtpNeeded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (params.get("idle")) setError(t.login.idleExpired);
  }, [params, t.login.idleExpired]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      otp: String(formData.get("otp") ?? ""),
      redirect: false,
    });
    setPending(false);
    if (result?.error === "OTP_REQUIRED") {
      setOtpNeeded(true);
      setError(t.login.otpNeeded);
      return;
    }
    if (result?.error === "DATABASE_UNAVAILABLE") {
      setError(t.login.dbDown);
      return;
    }
    if (result?.error) {
      setError(t.login.badCreds);
      return;
    }
    const session = await getSession();
    if (session?.user.passwordExpired) {
      router.push(`${accountPath(session.user.role)}?expired=1`);
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <Logo size="lg" />
          <LocaleToggle />
        </div>
        <CardTitle className="pt-2">{t.login.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input id="email" name="email" type="email" required defaultValue="admin@netmon.click" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.login.password}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {otpNeeded && (
            <div className="space-y-2">
              <Label htmlFor="otp">{t.login.otp}</Label>
              <Input id="otp" name="otp" inputMode="numeric" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={pending}>
            {pending ? t.login.pending : t.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
