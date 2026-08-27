"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERMISSIONS,
  ROLES,
  isCapabilityLocked,
  type Permission,
  type Role,
  type RoleMatrix,
} from "@/lib/roles";

type Payload = {
  matrix: RoleMatrix;
  defaults: RoleMatrix;
  meta: {
    permissions: Record<Permission, { label: string; description: string; category: string }>;
    roles: Record<Role, { label: string; description: string }>;
  };
  locked: Array<{ role: Role; permission: Permission }>;
};

function matrixEqual(a: RoleMatrix, b: RoleMatrix) {
  return ROLES.every((role) => {
    const left = [...a[role]].sort().join(",");
    const right = [...b[role]].sort().join(",");
    return left === right;
  });
}

export function CapabilityMatrix() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<RoleMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/capabilities");
    if (!res.ok) {
      toast.error("Unable to load capability matrix");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Payload;
    setPayload(data);
    setDraft(data.matrix);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!payload || !draft) return false;
    return !matrixEqual(draft, payload.matrix);
  }, [draft, payload]);

  const categories = useMemo(() => {
    if (!payload) return [] as string[];
    const order: string[] = [];
    for (const permission of PERMISSIONS) {
      const cat = payload.meta.permissions[permission].category;
      if (!order.includes(cat)) order.push(cat);
    }
    return order;
  }, [payload]);

  function toggle(role: Role, permission: Permission) {
    if (!draft || isCapabilityLocked(role, permission)) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const set = new Set(prev[role]);
      if (set.has(permission)) set.delete(permission);
      else set.add(permission);
      return { ...prev, [role]: PERMISSIONS.filter((p) => set.has(p)) };
    });
  }

  function granted(role: Role, permission: Permission) {
    return Boolean(draft?.[role]?.includes(permission));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/capabilities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix: draft }),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      const data = (await res.json()) as Payload & { ok: boolean };
      setPayload(data);
      setDraft(data.matrix);
      toast.success("Capability matrix saved");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!confirm("Reset all roles to product defaults?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) {
        toast.error("Reset failed");
        return;
      }
      const data = (await res.json()) as Payload & { ok: boolean };
      setPayload(data);
      setDraft(data.matrix);
      toast.success("Restored product defaults");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !payload || !draft) {
    return <p className="text-sm text-muted-foreground">Loading capability matrix…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Capability Matrix</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Platform-wide access control. Toggle grants per role. Locked cells enforce product invariants
            (platform admin, portal read-only). API checks update immediately; navigation refreshes with the
            next session update (~5 minutes) or re-login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void resetDefaults()}>
            Reset defaults
          </Button>
          <Button type="button" variant="outline" disabled={!dirty || saving} onClick={() => setDraft(payload.matrix)}>
            Discard
          </Button>
          <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
            Save matrix
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role) => (
          <Card key={role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{payload.meta.roles[role].label}</CardTitle>
              <CardDescription>{payload.meta.roles[role].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl">{draft[role].length}</p>
              <p className="text-xs text-muted-foreground">of {PERMISSIONS.length} capabilities</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access grid</CardTitle>
          <CardDescription>
            Click a cell to grant or revoke. Dimmed cells are locked.
            {dirty ? " · Unsaved changes" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-card px-5 py-3">Capability</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-3 text-center font-medium normal-case tracking-normal">
                    {payload.meta.roles[role].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Fragment key={category}>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <td colSpan={ROLES.length + 1} className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {category}
                    </td>
                  </tr>
                  {PERMISSIONS.filter((p) => payload.meta.permissions[p].category === category).map((permission) => (
                    <tr key={permission} className="border-b border-border/70 odd:bg-muted/10">
                      <td className="sticky left-0 z-10 bg-card px-5 py-2.5">
                        <p className="font-medium">{payload.meta.permissions[permission].label}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{permission}</p>
                        <p className="text-xs text-muted-foreground">{payload.meta.permissions[permission].description}</p>
                      </td>
                      {ROLES.map((role) => {
                        const on = granted(role, permission);
                        const locked = isCapabilityLocked(role, permission);
                        return (
                          <td key={`${role}-${permission}`} className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={locked || saving}
                              title={locked ? "Locked by product policy" : on ? "Granted — click to revoke" : "Denied — click to grant"}
                              onClick={() => toggle(role, permission)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-mono transition-colors duration-200 ease-out ${
                                on
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground"
                              } ${locked ? "cursor-not-allowed opacity-40" : "hover:border-primary/40"}`}
                            >
                              {on ? "Y" : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
