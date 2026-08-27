"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/layout/locale-provider";
import {
  DEFAULT_IDLE_MINUTES,
  IDLE_ACTIVITY_THROTTLE_MS,
  IDLE_CHANNEL,
  IDLE_WARN_MS,
  idleRemainingMs,
  idleTimeoutMs,
  parseIdleMinutes,
  shouldWarnIdle,
  type IdleMinutes,
} from "@/lib/idle";

function formatCountdown(ms: number) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return String(seconds);
}

export function IdleSessionGuard({ minutes }: { minutes?: number }) {
  const { t } = useI18n();
  const idleMinutes = parseIdleMinutes(minutes ?? DEFAULT_IDLE_MINUTES);
  const [warn, setWarn] = useState(false);
  const [remainingMs, setRemainingMs] = useState(IDLE_WARN_MS);
  const lastLocal = useRef(Date.now());
  const lastPing = useRef(0);
  const loggingOut = useRef(false);

  const logout = useCallback((reason: "idle" | "broadcast" = "idle") => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      const channel = new BroadcastChannel(IDLE_CHANNEL);
      channel.postMessage({ type: "logout", reason });
      channel.close();
    } catch {
      // BroadcastChannel unavailable — still sign out this tab.
    }
    void signOut({ callbackUrl: "/login?idle=1" });
  }, []);

  const pingServer = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastPing.current < IDLE_ACTIVITY_THROTTLE_MS) return;
    lastPing.current = now;
    try {
      await fetch("/api/security/activity", { method: "POST", credentials: "same-origin" });
    } catch {
      // Offline: local countdown still applies; middleware enforces on next navigation.
    }
  }, []);

  const markActive = useCallback(
    (force = false) => {
      const now = Date.now();
      lastLocal.current = now;
      setWarn(false);
      void pingServer(force);
    },
    [pingServer],
  );

  useEffect(() => {
    if (idleMinutes === 0) {
      void pingServer(true);
      return;
    }

    lastLocal.current = Date.now();
    void pingServer(true);

    const onActivity = () => markActive();
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
      "wheel",
    ];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true, capture: true }));

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const last = lastLocal.current;
      if (Date.now() - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        logout("idle");
        return;
      }
      markActive(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(IDLE_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "logout") logout("broadcast");
      };
    } catch {
      channel = null;
    }

    const timer = window.setInterval(() => {
      if (loggingOut.current) return;
      const last = lastLocal.current;
      const now = Date.now();
      if (now - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        logout("idle");
        return;
      }
      const remaining = idleRemainingMs(last, idleMinutes as IdleMinutes, now);
      const warning = shouldWarnIdle(last, idleMinutes as IdleMinutes, now);
      setWarn(warning);
      if (warning) setRemainingMs(remaining);
    }, 1_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity, true));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      channel?.close();
    };
  }, [idleMinutes, logout, markActive, pingServer]);

  if (idleMinutes === 0 || !warn) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-lg"
    >
      <p className="text-sm text-foreground">
        {t.session.warn.replace("{n}", formatCountdown(remainingMs))}
      </p>
      <Button className="mt-3 w-full" size="sm" onClick={() => markActive(true)}>
        {t.session.stay}
      </Button>
    </div>
  );
}
