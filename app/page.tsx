import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const TAGLINES = [
  "Your Network, Always On",
  "Click to Monitor Everything",
  "Enterprise Network Visibility",
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_45%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start onboarding</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 pt-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary">netmon.click</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">NETMON</h1>
          <p className="mt-4 text-lg text-muted-foreground">{TAGLINES[0]}. Multi-tenant NMS for on-premise and Cloud SaaS.</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {TAGLINES.map((line) => (
              <li key={line}>— {line}</li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Create tenant</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/status/demo">Public status</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-6">
          <p className="font-mono text-xs text-muted-foreground">15 modules ready</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              "Poller",
              "Alert",
              "SLA",
              "Topology",
              "CSV/Excel import",
              "Bulk actions",
              "PDF report",
              "Status page",
              "2FA + SSO",
              "Agent",
              "Dashboard builder",
              "Customer portal",
              "User management",
              "Onboarding",
              "Superadmin",
            ].map((item) => (
              <div key={item} className="rounded-md bg-muted/60 px-3 py-2">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
