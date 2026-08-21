"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/layout/locale-provider";

export function PasswordForm() {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (next !== confirm) {
      toast.error(t.account.mismatch);
      return;
    }
    setPending(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? t.account.failed);
      return;
    }
    toast.success(t.account.changed);
    (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
  }

  return (
    <form id="password-form" action={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">{t.account.current}</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">{t.account.next}</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t.account.confirm}</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.account.change}
      </Button>
    </form>
  );
}
