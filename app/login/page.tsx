"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [otpNeeded, setOtpNeeded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      setError("Masukkan kode 2FA.");
      return;
    }
    if (result?.error) {
      setError("Email atau password salah.");
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Logo />
        <CardTitle className="pt-2">Sign in to NETMON</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue="admin@netmon.click" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {otpNeeded && (
            <div className="space-y-2">
              <Label htmlFor="otp">Authenticator code</Label>
              <Input id="otp" name="otp" inputMode="numeric" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
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
