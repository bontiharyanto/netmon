"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/components/layout/locale-provider";
import { formatMinutes } from "@/lib/i18n";
import { accountPath, shouldRemindPassword } from "@/lib/password-policy";

export function PasswordReminder() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { data } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;

  const expired = Boolean(data?.user.passwordExpired);
  const daysLeft = data?.user.passwordDaysLeft ?? 30;
  const maxAge = data?.user.passwordDays ?? 30;
  const href = accountPath(data?.user.role);
  if (pathname === href) return null;
  if (!expired && !shouldRemindPassword(daysLeft, maxAge, expired)) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-950 dark:text-amber-100">
      <p>
        {expired
          ? t.passwordPolicy.expired
          : formatMinutes(t.passwordPolicy.daysLeft, daysLeft)}
      </p>
      <Link href={`${href}?expired=${expired ? "1" : "0"}`} className="font-medium text-primary hover:underline">
        {t.passwordPolicy.updateNow}
      </Link>
    </div>
  );
}
