"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/layout/locale-provider";
import { IDLE_OPTIONS, parseIdleMinutes, type IdleMinutes } from "@/lib/idle";
import { PASSWORD_DAY_OPTIONS, parsePasswordDays, type PasswordDays } from "@/lib/password-policy";
import { formatMinutes } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TickerSettingsCard } from "@/components/layout/ticker-settings-card";

export default function SecurityPage() {
  const { t } = useI18n();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [idle, setIdle] = useState<IdleMinutes>(30);
  const [sessionMaxHours, setSessionMaxHours] = useState(8);
  const [passwordDays, setPasswordDays] = useState<PasswordDays>(30);
  const [savingIdle, setSavingIdle] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/security/session")
      .then((res) => res.json())
      .then((data) => {
        setIdle(parseIdleMinutes(data.idle_minutes));
        setPasswordDays(parsePasswordDays(data.password_days));
        if (typeof data.session_max_hours === "number") setSessionMaxHours(data.session_max_hours);
      })
      .catch(() => undefined);
  }, []);

  async function start2fa() {
    const res = await fetch("/api/security/2fa", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Unable to start 2FA");
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
      toast.error("Invalid 2FA code");
      return;
    }
    toast.success("2FA enabled");
  }

  async function saveIdle(minutes: IdleMinutes) {
    setIdle(minutes);
    setSavingIdle(true);
    const res = await fetch("/api/security/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idle_minutes: minutes }),
    });
    setSavingIdle(false);
    if (!res.ok) {
      toast.error("Unable to save session timeout");
      return;
    }
    toast.success(t.session.saved);
  }

  async function savePasswordDays(days: PasswordDays) {
    setPasswordDays(days);
    setSavingPassword(true);
    const res = await fetch("/api/security/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password_days: days }),
    });
    setSavingPassword(false);
    if (!res.ok) {
      toast.error("Unable to save password policy");
      return;
    }
    toast.success(t.passwordPolicy.saved);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.session.title}</CardTitle>
          <CardDescription>{t.session.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {IDLE_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              disabled={savingIdle}
              onClick={() => saveIdle(minutes)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm",
                idle === minutes ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
              )}
            >
              {minutes === 0 ? t.session.never : formatMinutes(t.session.minutes, minutes)}
            </button>
          ))}
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            {t.session.absolute.replace("{n}", String(sessionMaxHours))}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.passwordPolicy.title}</CardTitle>
          <CardDescription>{t.passwordPolicy.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {PASSWORD_DAY_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              disabled={savingPassword}
              onClick={() => savePasswordDays(days)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm",
                passwordDays === days ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
              )}
            >
              {days === 0 ? t.passwordPolicy.never : formatMinutes(t.passwordPolicy.days, days)}
            </button>
          ))}
        </CardContent>
      </Card>
      <TickerSettingsCard />
      <Card>
        <CardHeader>
          <CardTitle>{t.security.totpTitle}</CardTitle>
          <CardDescription>{t.security.totpHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={start2fa}>{t.security.generate}</Button>
          {qr && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="2FA QR" className="h-40 w-40 rounded bg-white p-2" />
              <p className="font-mono text-xs">{secret}</p>
              <form action={confirm2fa} className="flex gap-2">
                <Input name="token" placeholder="123456" />
                <Button type="submit">{t.security.enable}</Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.security.ssoTitle}</CardTitle>
          <CardDescription>{t.security.ssoHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Callback: <span className="font-mono">https://netmon.click/api/auth/callback/oidc</span>
          </p>
          <Input placeholder="OIDC issuer URL" />
          <Input placeholder="Client ID" />
          <Button variant="outline">{t.common.save} SSO</Button>
        </CardContent>
      </Card>
    </div>
  );
}
