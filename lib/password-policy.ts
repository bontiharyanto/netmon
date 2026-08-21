export const PASSWORD_DAY_OPTIONS = [0, 30, 60, 90] as const;
export const DEFAULT_PASSWORD_DAYS = 30;
export const PASSWORD_REMIND_DAYS = 7;

export type PasswordDays = (typeof PASSWORD_DAY_OPTIONS)[number];

export function parsePasswordDays(value: unknown): PasswordDays {
  const n = Number(value);
  if (n === 0 || n === 30 || n === 60 || n === 90) return n;
  return DEFAULT_PASSWORD_DAYS;
}

export function passwordAgeMs(changedAt: Date | string | null | undefined, now = Date.now()) {
  if (!changedAt) return Number.POSITIVE_INFINITY;
  return now - new Date(changedAt).getTime();
}

export function isPasswordExpired(
  changedAt: Date | string | null | undefined,
  maxAgeDays: number,
  now = Date.now(),
) {
  if (maxAgeDays === 0) return false;
  if (!changedAt) return false;
  return passwordAgeMs(changedAt, now) >= maxAgeDays * 86_400_000;
}

export function daysUntilPasswordExpiry(
  changedAt: Date | string | null | undefined,
  maxAgeDays: number,
  now = Date.now(),
) {
  if (maxAgeDays === 0) return maxAgeDays;
  if (!changedAt) return maxAgeDays;
  const due = new Date(changedAt).getTime() + maxAgeDays * 86_400_000;
  return Math.max(0, Math.ceil((due - now) / 86_400_000));
}

export function shouldRemindPassword(daysLeft: number, maxAgeDays: number, expired: boolean) {
  if (expired || maxAgeDays === 0) return false;
  return daysLeft <= PASSWORD_REMIND_DAYS;
}

export function accountPath(role?: string | null) {
  return role === "viewer" ? "/portal/account" : "/dashboard/account";
}

export function isAccountPath(pathname: string) {
  return pathname === "/dashboard/account" || pathname === "/portal/account";
}
