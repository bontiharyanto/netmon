import { StatusBadge } from "@/components/status-badge";

type Node = { id: string; hostname: string; status: string };
type Link = { id: string; from_device_id: string; to_device_id: string; status: string };

export function NetworkMap({ devices, links }: { devices: Node[]; links: Link[] }) {
  const positions = devices.map((device, index) => {
    const angle = (index / Math.max(devices.length, 1)) * Math.PI * 2;
    return {
      ...device,
      x: 280 + Math.cos(angle) * 180,
      y: 220 + Math.sin(angle) * 150,
    };
  });

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 560 440" className="h-[440px] w-full rounded-lg bg-muted/30">
        {links.map((link) => {
          const from = positions.find((d) => d.id === link.from_device_id);
          const to = positions.find((d) => d.id === link.to_device_id);
          if (!from || !to) return null;
          const color = link.status === "down" ? "#ef4444" : link.status === "degraded" ? "#f59e0b" : "#00E5C3";
          return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2" />;
        })}
        {positions.map((device) => (
          <g key={device.id}>
            <circle cx={device.x} cy={device.y} r="14" fill={device.status === "down" ? "#ef4444" : device.status === "degraded" ? "#f59e0b" : "#00E5C3"} />
            <text x={device.x} y={device.y + 28} textAnchor="middle" fill="currentColor" fontSize="11">
              {device.hostname}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 text-xs">
        {devices.slice(0, 8).map((device) => (
          <span key={device.id} className="flex items-center gap-2 rounded-full bg-muted/50 px-2 py-1">
            {device.hostname}
            <StatusBadge status={device.status} />
          </span>
        ))}
      </div>
    </div>
  );
}
