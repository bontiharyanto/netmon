"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/layout/locale-provider";

export function PortalAccountLinks({ email }: { email?: string | null }) {
  const { t } = useI18n();
  return (
    <>
      <Link href="/portal/account" className="hidden font-mono text-xs hover:text-foreground sm:inline">
        {email}
      </Link>
      <Button variant="outline" size="sm" asChild>
        <Link href="/portal/account">{t.account.title}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
        {t.common.signOut}
      </Button>
    </>
  );
}
