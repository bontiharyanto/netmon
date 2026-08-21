"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/brand/logo";

const DURATION_MS = 2800;

export function LoginSplash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduce ? 400 : DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone, reduce]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.86, rotate: reduce ? 0 : -12 }}
        animate={
          reduce
            ? { opacity: 1, scale: 1, rotate: 0 }
            : { opacity: 1, scale: [0.86, 1.16, 0.94, 1.1, 1], rotate: 360 }
        }
        transition={{ duration: reduce ? 0.2 : 2.6, ease: "easeInOut" }}
      >
        <Logo compact size="xl" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.35, duration: 0.4, ease: "easeOut" }}
        className="mt-5 font-mono text-sm font-semibold tracking-[0.32em] text-primary"
      >
        NETMON
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.55, duration: 0.4, ease: "easeOut" }}
        className="mt-3 text-[11px] tracking-[0.14em] text-muted-foreground"
      >
        Copyright by Rough Technology
      </motion.p>
    </div>
  );
}
