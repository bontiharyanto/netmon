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
  "kb.read",
  "kb.write",
  "platform.admin",
  "noc.console",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type RoleMatrix = Record<Role, Permission[]>;

/** Built-in product defaults — used until DB matrix is loaded / as reset target. */
export const DEFAULT_MATRIX: RoleMatrix = {
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
    "kb.read",
    "kb.write",
    "noc.console",
  ],
  viewer: [
    "assets.read",
    "cmdb.read",
    "topology.read",
    "sla.read",
    "alert.read",
    "ai.use",
    "kb.read",
  ],
};

export const PERMISSION_META: Record<
  Permission,
  { label: string; description: string; category: string }
> = {
  "assets.read": { label: "Assets read", description: "View device inventory", category: "Assets" },
  "assets.write": { label: "Assets write", description: "Create and edit devices", category: "Assets" },
  "cmdb.read": { label: "CMDB read", description: "View configuration items", category: "Assets" },
  "cmdb.write": { label: "CMDB write", description: "Create and edit CIs", category: "Assets" },
  "topology.read": { label: "Topology read", description: "View network map", category: "Monitor" },
  "topology.write": { label: "Topology write", description: "Edit links and layout", category: "Monitor" },
  "sla.read": { label: "SLA read", description: "View uptime figures", category: "Monitor" },
  "alert.read": { label: "Alert read", description: "View alerts and tickets", category: "Monitor" },
  "alert.write": { label: "Alert write", description: "Acknowledge and resolve alerts", category: "Monitor" },
  "ai.use": { label: "AI use", description: "Ask NETMON AI (tenant-scoped)", category: "Analyze" },
  "ai.manage": { label: "AI manage", description: "Configure AI provider settings", category: "Admin" },
  "users.manage": { label: "Users manage", description: "Invite and role-assign users", category: "Admin" },
  "security.manage": { label: "Security manage", description: "Idle, password, 2FA, ticker", category: "Admin" },
  "reports.export": { label: "Reports export", description: "Reporting Center downloads", category: "Analyze" },
  "agent.enroll": { label: "Agent enroll", description: "Issue and manage agents", category: "Assets" },
  "dashboard.builder": { label: "Dashboard builder", description: "Custom NOC boards", category: "Analyze" },
  "bulk.actions": { label: "Bulk actions", description: "Multi-device operations", category: "Assets" },
  "import.inventory": { label: "Import inventory", description: "CSV / Excel import", category: "Assets" },
  "channels.manage": { label: "Channels manage", description: "Notify + ticketing connectors", category: "Admin" },
  "kb.read": { label: "Knowledge read", description: "View knowledge base", category: "Analyze" },
  "kb.write": { label: "Knowledge write", description: "Edit knowledge articles", category: "Analyze" },
  "platform.admin": { label: "Platform admin", description: "Cross-tenant platform console", category: "Platform" },
  "noc.console": { label: "NOC console", description: "Access NOC shell (non-portal)", category: "Monitor" },
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  superadmin: { label: "Superadmin", description: "NETMON platform" },
  admin: { label: "Admin", description: "Tenant owner" },
  operator: { label: "Operator", description: "NOC operations" },
  viewer: { label: "Viewer", description: "Customer portal" },
};

/** Cells that cannot be toggled (product invariants). */
export function isCapabilityLocked(role: Role, permission: Permission): boolean {
  if (permission === "platform.admin") return true;
  if (role === "viewer") {
    const portalDenied: Permission[] = [
      "assets.write",
      "cmdb.write",
      "topology.write",
      "alert.write",
      "ai.manage",
      "users.manage",
      "security.manage",
      "reports.export",
      "agent.enroll",
      "dashboard.builder",
      "bulk.actions",
      "import.inventory",
      "channels.manage",
      "kb.write",
      "platform.admin",
      "noc.console",
    ];
    return portalDenied.includes(permission);
  }
  return false;
}

export function cloneMatrix(source: RoleMatrix = DEFAULT_MATRIX): RoleMatrix {
  return {
    superadmin: [...source.superadmin],
    admin: [...source.admin],
    operator: [...source.operator],
    viewer: [...source.viewer],
  };
}

/** Enforce platform.admin + viewer portal invariants on any matrix. */
export function applyCapabilityInvariants(matrix: RoleMatrix): RoleMatrix {
  const next = cloneMatrix(matrix);
  for (const role of ROLES) {
    const set = new Set(next[role].filter((p) => PERMISSIONS.includes(p)));
    if (role === "superadmin") set.add("platform.admin");
    else set.delete("platform.admin");
    if (role === "viewer") {
      for (const permission of PERMISSIONS) {
        if (isCapabilityLocked("viewer", permission) && permission !== "platform.admin") {
          set.delete(permission);
        }
      }
    }
    next[role] = PERMISSIONS.filter((p) => set.has(p));
  }
  return next;
}

let runtimeMatrix: RoleMatrix | null = null;

export function getRuntimeMatrix(): RoleMatrix {
  return runtimeMatrix ?? DEFAULT_MATRIX;
}

export function setRuntimeMatrix(matrix: RoleMatrix | null) {
  runtimeMatrix = matrix ? applyCapabilityInvariants(matrix) : null;
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
  granted?: readonly string[] | null,
) {
  if (granted && granted.length > 0) return granted.includes(permission);
  if (!role || !ROLES.includes(role as Role)) return false;
  return getRuntimeMatrix()[role as Role].includes(permission);
}

export function canWrite(role?: string | null, granted?: readonly string[] | null) {
  return hasPermission(role, "assets.write", granted);
}

export function canManageUsers(role?: string | null, granted?: readonly string[] | null) {
  return hasPermission(role, "users.manage", granted);
}

export function isSuperadmin(role?: string | null, granted?: readonly string[] | null) {
  return hasPermission(role, "platform.admin", granted);
}

export function isViewer(role?: string | null) {
  return role === "viewer";
}

export function permissionsForRoleSync(role: string | null | undefined): Permission[] {
  if (!role || !ROLES.includes(role as Role)) return [];
  return [...getRuntimeMatrix()[role as Role]];
}
