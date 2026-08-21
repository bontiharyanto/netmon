"use client";

import { useSearchParams } from "next/navigation";
import { PasswordForm } from "@/components/account/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/layout/locale-provider";

export function AccountView({ email, role }: { email?: string | null; role?: string }) {
  const { t } = useI18n();
  const expired = useSearchParams().get("expired") === "1";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.account.title}</h1>
        <p className="text-sm text-muted-foreground">{t.account.subtitle}</p>
      </div>
      {expired && (
        <p className="max-w-lg rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {t.passwordPolicy.expired}
        </p>
      )}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="font-mono text-base">{email}</CardTitle>
          <CardDescription className="font-mono uppercase">{role}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
