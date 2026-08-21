import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { AiCopilot } from "@/components/ai/ai-copilot";
import { AiInsights } from "@/components/ai/ai-insights";

export default async function PortalAiPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">NETMON AI</h1>
        <p className="text-sm text-muted-foreground">Read-only insights for your tenant. The copilot cannot change anything.</p>
      </div>
      <AiInsights />
      <AiCopilot />
    </div>
  );
}
