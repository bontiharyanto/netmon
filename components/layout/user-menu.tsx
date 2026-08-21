"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

export function UserMenu({
  email,
  role,
}: {
  email?: string | null;
  role?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const account = role === "viewer" ? "/portal/account" : "/dashboard/account";
  const portal = "/portal";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex max-w-[13rem] items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-muted",
          open && "bg-muted",
        )}
      >
        <span className="truncate font-mono text-xs text-muted-foreground">{email}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-border bg-card py-1 shadow-lg">
          <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{role}</p>
          <Link
            href={account}
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            {t.account.title}
          </Link>
          {role !== "viewer" && (
            <Link href={portal} className="block px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              {t.common.portal}
            </Link>
          )}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            {t.common.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
