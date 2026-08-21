"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserRow = { id: string; email: string; name: string | null; role: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(formData: FormData) {
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
      toast.error("Gagal menambah user");
      return;
    }
    toast.success("User dibuat");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User management</h1>
        <p className="text-sm text-muted-foreground">Role: superadmin, admin, operator, viewer.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Invite user</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-3 md:grid-cols-5">
            <Input name="name" placeholder="name" required />
            <Input name="email" type="email" placeholder="email" required />
            <Input name="password" type="password" placeholder="password" required />
            <select name="role" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="viewer">viewer</option>
              <option value="operator">operator</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{user.name ?? user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span className="font-mono text-xs uppercase">{user.role}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
