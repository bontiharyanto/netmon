import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Ci = {
  id: string;
  name: string;
  ci_type: string;
  asset_tag: string | null;
  serial: string | null;
  owner: string | null;
  status: string;
  location: string | null;
  device: { hostname: string; ip: string; status: string } | null;
  last_synced_at?: string | Date | null;
  last_sync_error?: string | null;
};

export function CmdbTable({ items }: { items: Ci[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CMDB</CardTitle>
        <CardDescription>Configuration items linked to the live inventory</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">CI</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Asset tag</th>
              <th className="px-5 py-3">Serial</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Linked device</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">NovaCRM</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/70 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.location ?? "—"}</p>
                </td>
                <td className="px-5 py-3 capitalize">{item.ci_type}</td>
                <td className="px-5 py-3 font-mono text-xs">{item.asset_tag ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{item.serial ?? "—"}</td>
                <td className="px-5 py-3">{item.owner ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {item.device ? `${item.device.hostname} · ${item.device.ip}` : "unlinked"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3">
                  {item.last_sync_error ? (
                    <span className="text-xs text-destructive" title={item.last_sync_error}>
                      Sync error
                    </span>
                  ) : item.last_synced_at ? (
                    <span className="font-mono text-xs text-muted-foreground">Synced</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
