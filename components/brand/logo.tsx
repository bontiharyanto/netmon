import { cn } from "@/lib/utils";

function NetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="#070B14" />
      <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="12.75" stroke="#00E5C3" strokeOpacity="0.38" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="22" stroke="#00E5C3" strokeOpacity="0.1" />
      <circle cx="32" cy="32" r="15.5" stroke="#00E5C3" strokeOpacity="0.16" />
      <circle cx="32" cy="32" r="8.5" stroke="#00E5C3" strokeOpacity="0.22" />
      <path d="M32 32V12.5" stroke="#00E5C3" strokeOpacity="0.28" strokeWidth="1" />
      <path d="M32 32L47.5 19" stroke="#00E5C3" strokeOpacity="0.22" strokeWidth="1" />
      <path d="M32 10.5A21.5 21.5 0 0 1 50 23.5" stroke="#00E5C3" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="1.6" fill="#00E5C3" />
      <text
        x="32"
        y="38.5"
        textAnchor="middle"
        fill="#00E5C3"
        fontFamily="ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace"
        fontSize="13"
        fontWeight="600"
        letterSpacing="2.4"
      >
        NET
      </text>
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  pulse = false,
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  pulse?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const mark = size === "xl" ? "h-24 w-24" : size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const radius = size === "xl" ? "rounded-[18px]" : "rounded-[10px]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("relative shrink-0 overflow-hidden shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]", radius, mark)}>
        {pulse && <span className="pointer-events-none absolute inset-0 rounded-[10px] border border-primary/30 animate-pulseRing" />}
        <NetMark className="h-full w-full" />
      </span>
      {!compact && (
        <span className="flex items-baseline leading-none">
          <span className="font-mono text-[15px] font-semibold tracking-[0.28em] text-primary">NET</span>
          <span className="font-mono text-[15px] font-semibold tracking-[0.28em] text-foreground/80">MON</span>
        </span>
      )}
    </div>
  );
}

export function NetWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono font-semibold tracking-[0.32em] text-primary", className)}>NET</span>
  );
}
