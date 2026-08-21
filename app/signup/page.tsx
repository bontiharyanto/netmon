"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: form.get("company"),
        slug: form.get("slug"),
        email: form.get("email"),
        password: form.get("password"),
        name: form.get("name"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat tenant");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <Logo size="lg" />
          <CardTitle>Onboarding tenant</CardTitle>
          <CardDescription>Subdomain akan jadi {`{slug}`}.netmon.click</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Nama perusahaan</Label>
              <Input id="company" name="company" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug subdomain</Label>
              <Input id="slug" name="slug" required placeholder="acme" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nama admin</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Management email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button disabled={pending}>{pending ? "Creating…" : "Create tenant"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
