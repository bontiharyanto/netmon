import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { AiCopilot } from "@/components/ai/ai-copilot";
import { AiInsights } from "@/components/ai/ai-insights";

export default async function AiPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">NETMON AI</p>
        <h1 className="mt-1 text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Tenant-scoped analysis. Configure the engine in Settings → AI integration.
        </p>
      </div>
      <AiInsights />
      <AiCopilot />
    </div>
  );
}
