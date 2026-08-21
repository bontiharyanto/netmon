import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <span className="absolute inset-0 rounded-full border border-primary/40 animate-pulseRing" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary radar-dot" />
      </span>
      {!compact && <span className="font-mono text-lg font-bold tracking-[0.18em]">NETMON</span>}
    </div>
  );
}
