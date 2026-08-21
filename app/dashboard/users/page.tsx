"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserRow = { id: string; email: string; name: string | null; role: string };

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export default function UsersPage() {
  const { data } = useSession();
  const selfId = data?.user.id;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; email: string; role: string; password: string }>>(
    {},
  );

  async function load() {
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const rows: UserRow[] = await res.json();
    setUsers(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((user) => [user.id, { name: user.name ?? "", email: user.email, role: user.role, password: "" }]),
      ),
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name"),
        role: formData.get("role"),
        password: formData.get("password"),
      }),
    });
    if (!res.ok) {
      toast.error("Unable to add user");
      return;
    }
    toast.success("User created");
    form.reset();
    load();
  }

  async function saveUser(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    if (draft.password && draft.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        email: draft.email,
        role: draft.role,
        ...(draft.password ? { password: draft.password } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Unable to update user");
      return;
    }
    toast.success("User updated");
    load();
  }

  async function removeUser(user: UserRow) {
    if (!confirm(`Delete ${user.email}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Unable to delete user");
      return;
    }
    toast.success("User deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User management</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit role, reset password, or delete. You cannot remove yourself or the last admin. Superadmin stays on
          the platform page.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invite user</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="grid gap-3 md:grid-cols-5">
            <Input name="name" placeholder="name" required />
            <Input name="email" type="email" placeholder="email" required />
            <Input name="password" type="password" placeholder="password" minLength={8} required />
            <select name="role" className={selectClass} defaultValue="viewer">
              <option value="viewer">viewer</option>
              <option value="operator">operator</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">New password</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = drafts[user.id] ?? {
                  name: user.name ?? "",
                  email: user.email,
                  role: user.role,
                  password: "",
                };
                const locked = user.role === "superadmin";
                return (
                  <tr key={user.id} className="border-b border-border/70">
                    <td className="p-3">
                      <Input
                        value={draft.name}
                        disabled={locked}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, name: event.target.value } }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="email"
                        value={draft.email}
                        disabled={locked}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, email: event.target.value } }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <select
                        className={selectClass}
                        value={draft.role}
                        disabled={locked || user.id === selfId}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, role: event.target.value } }))
                        }
                      >
                        {user.role === "superadmin" && <option value="superadmin">superadmin</option>}
                        <option value="admin">admin</option>
                        <option value="operator">operator</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <Input
                        type="password"
                        placeholder={locked ? "—" : "optional"}
                        value={draft.password}
                        disabled={locked}
                        minLength={8}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, password: event.target.value } }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => saveUser(user.id)}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={locked || user.id === selfId}
                          onClick={() => removeUser(user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
