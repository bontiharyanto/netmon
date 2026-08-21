"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/layout/locale-provider";
import {
  DEFAULT_IDLE_MINUTES,
  IDLE_COOKIE,
  idleTimeoutMs,
  parseIdleMinutes,
  shouldWarnIdle,
  type IdleMinutes,
} from "@/lib/idle";

function readLastActive() {
  if (typeof document === "undefined") return Date.now();
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${IDLE_COOKIE}=`));
  const value = match ? Number(match.slice(IDLE_COOKIE.length + 1)) : NaN;
  return Number.isFinite(value) ? value : Date.now();
}

function writeLastActive(at = Date.now()) {
  document.cookie = `${IDLE_COOKIE}=${at}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export function IdleSessionGuard({ minutes }: { minutes?: number }) {
  const { t } = useI18n();
  const idleMinutes = parseIdleMinutes(minutes ?? DEFAULT_IDLE_MINUTES);
  const [warn, setWarn] = useState(false);
  const lastWrite = useRef(0);
  const loggingOut = useRef(false);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastWrite.current < 5_000) return;
    lastWrite.current = now;
    writeLastActive(now);
    setWarn(false);
  }, []);

  useEffect(() => {
    if (idleMinutes === 0) return;
    writeLastActive();
    const onActivity = () => markActive();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true, capture: true }));
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const last = readLastActive();
      if (Date.now() - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        loggingOut.current = true;
        void signOut({ callbackUrl: "/login?idle=1" });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => {
      if (loggingOut.current) return;
      const last = readLastActive();
      const now = Date.now();
      if (now - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        loggingOut.current = true;
        void signOut({ callbackUrl: "/login?idle=1" });
        return;
      }
      setWarn(shouldWarnIdle(last, idleMinutes as IdleMinutes, now));
    }, 1_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity, true));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [idleMinutes, markActive]);

  if (idleMinutes === 0 || !warn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-lg">
      <p className="text-sm text-foreground">{t.session.warn}</p>
      <Button className="mt-3 w-full" size="sm" onClick={() => markActive(true)}>
        {t.session.stay}
      </Button>
    </div>
  );
}
