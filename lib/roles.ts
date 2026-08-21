export const ROLES = ["superadmin", "admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "assets.read",
  "assets.write",
  "cmdb.read",
  "cmdb.write",
  "topology.read",
  "topology.write",
  "sla.read",
  "alert.read",
  "alert.write",
  "ai.use",
  "ai.manage",
  "users.manage",
  "security.manage",
  "reports.export",
  "agent.enroll",
  "dashboard.builder",
  "bulk.actions",
  "import.inventory",
  "channels.manage",
  "platform.admin",
  "noc.console",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, Permission[]> = {
  superadmin: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => p !== "platform.admin"),
  operator: [
    "assets.read",
    "assets.write",
    "cmdb.read",
    "cmdb.write",
    "topology.read",
    "topology.write",
    "sla.read",
    "alert.read",
    "alert.write",
    "ai.use",
    "reports.export",
    "agent.enroll",
    "dashboard.builder",
    "bulk.actions",
    "import.inventory",
    "noc.console",
  ],
  viewer: [
    "assets.read",
    "cmdb.read",
    "topology.read",
    "sla.read",
    "alert.read",
    "ai.use",
  ],
};

export function hasPermission(role: string | null | undefined, permission: Permission) {
  if (!role || !ROLES.includes(role as Role)) return false;
  return MATRIX[role as Role].includes(permission);
}

export function canWrite(role?: string | null) {
  return hasPermission(role, "assets.write");
}

export function canManageUsers(role?: string | null) {
  return hasPermission(role, "users.manage");
}

export function isSuperadmin(role?: string | null) {
  return hasPermission(role, "platform.admin");
}

export function isViewer(role?: string | null) {
  return role === "viewer";
}
