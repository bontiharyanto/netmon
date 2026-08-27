import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MATRIX,
  PERMISSION_META,
  PERMISSIONS,
  ROLE_META,
  ROLES,
  applyCapabilityInvariants,
  cloneMatrix,
  getRuntimeMatrix,
  isCapabilityLocked,
  setRuntimeMatrix,
  type Permission,
  type Role,
  type RoleMatrix,
} from "@/lib/roles";

let loadedAt = 0;
const CACHE_MS = 5_000;

function rowsToMatrix(
  rows: Array<{ role: string; permission: string; allowed: boolean }>,
): RoleMatrix {
  const matrix = cloneMatrix({
    superadmin: [],
    admin: [],
    operator: [],
    viewer: [],
  });
  for (const row of rows) {
    if (!ROLES.includes(row.role as Role)) continue;
    if (!PERMISSIONS.includes(row.permission as Permission)) continue;
    if (!row.allowed) continue;
    matrix[row.role as Role].push(row.permission as Permission);
  }
  return applyCapabilityInvariants(matrix);
}

function matrixToRows(matrix: RoleMatrix) {
  const normalized = applyCapabilityInvariants(matrix);
  const rows: Array<{ role: Role; permission: Permission; allowed: boolean }> = [];
  for (const role of ROLES) {
    const allowed = new Set(normalized[role]);
    for (const permission of PERMISSIONS) {
      rows.push({ role, permission, allowed: allowed.has(permission) });
    }
  }
  return rows;
}

async function persistCapabilityMatrix(matrix: RoleMatrix) {
  const rows = matrixToRows(matrix);
  await prisma.$transaction(
    rows.map((row) =>
      prisma.role_capability.upsert({
        where: { role_permission: { role: row.role, permission: row.permission } },
        create: {
          role: row.role,
          permission: row.permission,
          allowed: row.allowed,
        },
        update: { allowed: row.allowed },
      }),
    ),
  );
}

export async function loadCapabilityMatrix(force = false): Promise<RoleMatrix> {
  if (!force && loadedAt && Date.now() - loadedAt < CACHE_MS) {
    return cloneMatrix(getRuntimeMatrix());
  }
  try {
    const rows = await prisma.role_capability.findMany();
    if (rows.length === 0) {
      const defaults = applyCapabilityInvariants(cloneMatrix(DEFAULT_MATRIX));
      await persistCapabilityMatrix(defaults);
      setRuntimeMatrix(defaults);
      loadedAt = Date.now();
      return defaults;
    }
    const matrix = rowsToMatrix(rows);
    setRuntimeMatrix(matrix);
    loadedAt = Date.now();
    return matrix;
  } catch {
    const fallback = applyCapabilityInvariants(cloneMatrix(DEFAULT_MATRIX));
    setRuntimeMatrix(fallback);
    loadedAt = Date.now();
    return fallback;
  }
}

export async function getCapabilityMatrix(): Promise<RoleMatrix> {
  return loadCapabilityMatrix();
}

export async function saveCapabilityMatrix(input: RoleMatrix): Promise<RoleMatrix> {
  const matrix = applyCapabilityInvariants(input);
  await persistCapabilityMatrix(matrix);
  setRuntimeMatrix(matrix);
  loadedAt = Date.now();
  return matrix;
}

export async function resetCapabilityMatrix(): Promise<RoleMatrix> {
  return saveCapabilityMatrix(cloneMatrix(DEFAULT_MATRIX));
}

export async function permissionsForRole(role: string | null | undefined): Promise<Permission[]> {
  if (!role || !ROLES.includes(role as Role)) return [];
  const matrix = await getCapabilityMatrix();
  return [...matrix[role as Role]];
}

export async function roleAllows(role: string | null | undefined, permission: Permission) {
  const granted = await permissionsForRole(role);
  return granted.includes(permission);
}

export function lockedCapabilityCells(): Array<{ role: Role; permission: Permission }> {
  const locked: Array<{ role: Role; permission: Permission }> = [];
  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      if (isCapabilityLocked(role, permission)) locked.push({ role, permission });
    }
  }
  return locked;
}

export async function capabilityMatrixPayload() {
  const matrix = await getCapabilityMatrix();
  return {
    roles: ROLES,
    permissions: PERMISSIONS,
    matrix,
    defaults: cloneMatrix(DEFAULT_MATRIX),
    meta: { permissions: PERMISSION_META, roles: ROLE_META },
    locked: lockedCapabilityCells(),
  };
}
