import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  const variant = tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "crit" ? "crit" : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
