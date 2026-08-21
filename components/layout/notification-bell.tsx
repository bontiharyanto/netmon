"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  body: string;
  kind: string;
  severity: string;
  read: boolean;
  href: string;
  created_at: string;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);

  async function load(signal?: AbortSignal) {
    try {
      const res = await fetch("/api/notifications", { signal, cache: "no-store" });
      if (!res.ok) return;
      const data = await readJson(res);
      if (signal?.aborted) return;
      setUnread(data.unread ?? 0);
      setItems(data.items ?? []);
    } catch {
      // HMR / compile can abort fetch; never crash the shell
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const timer = setInterval(() => load(), 20000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  async function markAll() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      return;
    }
    load();
  }

  async function openItem(item: Item) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
    } catch {
      // still navigate
    }
    setOpen(false);
    router.push(item.href);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 font-mono text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <button type="button" className="text-xs text-primary hover:underline" onClick={markAll}>
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  "block w-full border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted/50",
                  !item.read && "bg-primary/5",
                )}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
