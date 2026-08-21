"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SecurityPage() {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");

  async function start2fa() {
    const res = await fetch("/api/security/2fa", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Gagal memulai 2FA");
      return;
    }
    setQr(data.qr);
    setSecret(data.secret);
  }

  async function confirm2fa(formData: FormData) {
    const res = await fetch("/api/security/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: formData.get("token") }),
    });
    if (!res.ok) {
      toast.error("Kode 2FA salah");
      return;
    }
    toast.success("2FA aktif");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Authenticator app (TOTP)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={start2fa}>Generate secret</Button>
          {qr && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="2FA QR" className="h-40 w-40 rounded bg-white p-2" />
              <p className="font-mono text-xs">{secret}</p>
              <form action={confirm2fa} className="flex gap-2">
                <Input name="token" placeholder="123456" />
                <Button type="submit">Enable</Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>SSO</CardTitle>
          <CardDescription>OIDC / SAML untuk tenant enterprise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Siapkan issuer, client id, dan ACS di sisi IdP. Callback: <span className="font-mono">https://netmon.click/api/auth/callback/oidc</span></p>
          <Input placeholder="OIDC issuer URL" />
          <Input placeholder="Client ID" />
          <Button variant="outline">Save SSO draft</Button>
        </CardContent>
      </Card>
    </div>
  );
}
