export const ROLES = ["superadmin", "admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export function canWrite(role?: string | null) {
  return role === "superadmin" || role === "admin" || role === "operator";
}

export function canManageUsers(role?: string | null) {
  return role === "superadmin" || role === "admin";
}

export function isSuperadmin(role?: string | null) {
  return role === "superadmin";
}
