import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "up" || value === "active" || value === "online") return "ok";
  if (value === "down" || value === "firing" || value === "critical") return "crit";
  if (value === "degraded" || value === "warning") return "warn";
  return "muted";
}
