"use client";

import { PasswordForm } from "@/components/account/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/layout/locale-provider";

export function AccountView({ email, role }: { email?: string | null; role?: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.account.title}</h1>
        <p className="text-sm text-muted-foreground">{t.account.subtitle}</p>
      </div>
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
