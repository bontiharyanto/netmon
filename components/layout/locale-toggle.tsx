"use client";

import { useI18n } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center rounded-md border border-border p-0.5 text-[11px] font-medium uppercase tracking-wide">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded px-1.5 py-0.5",
          locale === "en" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("id")}
        className={cn(
          "rounded px-1.5 py-0.5",
          locale === "id" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        ID
      </button>
    </div>
  );
}
