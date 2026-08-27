"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FloorPlanCanvas, PlacementList, type FloorPin } from "@/components/floors/floor-plan-canvas";

function SelectedPinMeta({
  pin,
  onSave,
}: {
  pin: FloorPin;
  onSave: (rack: string, zone: string) => void;
}) {
  const [rack, setRack] = useState(pin.rack ?? "");
  const [zone, setZone] = useState(pin.zone ?? "");

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">
        Edit <span className="font-medium text-foreground">{pin.device.hostname}</span>
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Zone
          <Input className="w-[120px]" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="A / Wing" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Rack
          <Input className="w-[120px]" value={rack} onChange={(e) => setRack(e.target.value)} placeholder="R12" />
        </label>
        <Button type="button" size="sm" onClick={() => onSave(rack, zone)}>
          Save
        </Button>
      </div>
    </div>
  );
}

type FloorSummary = {
  id: string;
  name: string;
  level: number;
  has_image: boolean;
  _count: { placements: number };
};

type Building = {
  id: string;
  name: string;
  address: string | null;
  floors: FloorSummary[];
};

type FloorDetail = {
  id: string;
  name: string;
  level: number;
  has_image: boolean;
  image_url: string | null;
  building: { id: string; name: string; address: string | null };
  placements: FloorPin[];
};

type DeviceOption = {
  id: string;
  hostname: string;
  ip: string;
  type: string;
  status: string;
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

export function FloorPlansManager({ canWrite }: { canWrite: boolean }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [floorId, setFloorId] = useState<string>("");
  const [floor, setFloor] = useState<FloorDetail | null>(null);
  const [placements, setPlacements] = useState<FloorPin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingDeviceId, setPlacingDeviceId] = useState<string | null>(null);
  const [placeRack, setPlaceRack] = useState("");
  const [placeZone, setPlaceZone] = useState("");
  const [showHeat, setShowHeat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [floorName, setFloorName] = useState("");
  const [floorLevel, setFloorLevel] = useState("0");
  const fileRef = useRef<HTMLInputElement>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBuildings = useCallback(async () => {
    const res = await fetch("/api/floors/buildings");
    if (!res.ok) {
      toast.error("Unable to load buildings");
      return;
    }
    const data = (await res.json()) as Building[];
    setBuildings(data);
    if (!buildingId && data[0]) {
      setBuildingId(data[0].id);
      if (data[0].floors[0]) setFloorId(data[0].floors[0].id);
    }
  }, [buildingId]);

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/devices");
    if (!res.ok) return;
    const data = (await res.json()) as DeviceOption[];
    setDevices(data);
  }, []);

  const loadFloor = useCallback(async (id: string) => {
    const res = await fetch(`/api/floors/${id}`);
    if (!res.ok) {
      toast.error("Unable to load floor");
      return;
    }
    const data = (await res.json()) as FloorDetail;
    setFloor(data);
    setPlacements(data.placements);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadBuildings(), loadDevices()]);
      setLoading(false);
    })();
  }, [loadBuildings, loadDevices]);

  useEffect(() => {
    if (floorId) void loadFloor(floorId);
    else {
      setFloor(null);
      setPlacements([]);
    }
  }, [floorId, loadFloor]);

  const currentBuilding = useMemo(
    () => buildings.find((item) => item.id === buildingId) ?? null,
    [buildings, buildingId],
  );

  useEffect(() => {
    if (!currentBuilding) {
      setBuildingName("");
      setBuildingAddress("");
      return;
    }
    setBuildingName(currentBuilding.name);
    setBuildingAddress(currentBuilding.address ?? "");
  }, [currentBuilding]);

  useEffect(() => {
    if (!floor) {
      setFloorName("");
      setFloorLevel("0");
      return;
    }
    setFloorName(floor.name);
    setFloorLevel(String(floor.level));
  }, [floor]);

  const placedIds = useMemo(() => new Set(placements.map((p) => p.device.id)), [placements]);
  const availableDevices = devices.filter((d) => !placedIds.has(d.id));

  async function createBuilding() {
    if (!buildingName.trim()) {
      toast.error("Building name is required (min 2 characters)");
      return;
    }
    if (buildingName.trim().length < 2) {
      toast.error("Building name must be at least 2 characters");
      return;
    }
    const res = await fetch("/api/floors/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: buildingName, address: buildingAddress || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const hint =
        res.status === 403
          ? "Forbidden — need assets.write (admin/operator)"
          : res.status === 404
            ? "API missing — rebuild/redeploy web image"
            : body?.error ?? `HTTP ${res.status}`;
      toast.error(`Could not create building: ${hint}`);
      return;
    }
    const created = (await res.json()) as Building;
    toast.success("Building created");
    await loadBuildings();
    setBuildingId(created.id);
    setFloorId("");
  }

  async function saveBuilding() {
    if (!buildingId) return;
    if (buildingName.trim().length < 2) {
      toast.error("Building name must be at least 2 characters");
      return;
    }
    const res = await fetch(`/api/floors/buildings/${buildingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: buildingName.trim(), address: buildingAddress.trim() || null }),
    });
    if (!res.ok) {
      toast.error("Could not update building");
      return;
    }
    toast.success("Building updated");
    await loadBuildings();
  }

  async function deleteBuilding() {
    if (!buildingId || !currentBuilding) return;
    if (!confirm(`Delete building “${currentBuilding.name}” and all its floors/pins?`)) return;
    const res = await fetch(`/api/floors/buildings/${buildingId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete building");
      return;
    }
    toast.success("Building deleted");
    setBuildingId("");
    setFloorId("");
    setFloor(null);
    await loadBuildings();
  }

  async function createFloor() {
    if (!buildingId || !floorName.trim()) return;
    const res = await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        building_id: buildingId,
        name: floorName,
        level: Number.parseInt(floorLevel, 10) || 0,
      }),
    });
    if (!res.ok) {
      toast.error("Could not create floor");
      return;
    }
    const created = (await res.json()) as { id: string };
    toast.success("Floor created");
    await loadBuildings();
    setFloorId(created.id);
  }

  async function saveFloor() {
    if (!floorId || !floorName.trim()) return;
    const res = await fetch(`/api/floors/${floorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: floorName.trim(),
        level: Number.parseInt(floorLevel, 10) || 0,
      }),
    });
    if (!res.ok) {
      toast.error("Could not update floor");
      return;
    }
    toast.success("Floor updated");
    await loadFloor(floorId);
    await loadBuildings();
  }

  async function deleteFloor() {
    if (!floorId || !confirm("Delete this floor and all device pins?")) return;
    const res = await fetch(`/api/floors/${floorId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Floor deleted");
    setFloorId("");
    await loadBuildings();
  }

  async function uploadImage(file: File) {
    if (!floorId) return;
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/floors/${floorId}/image`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Upload failed");
      return;
    }
    toast.success("Floor plan uploaded");
    await loadFloor(floorId);
    await loadBuildings();
  }

  async function placeAt(x: number, y: number) {
    if (!floorId || !placingDeviceId) return;
    const res = await fetch(`/api/floors/${floorId}/placements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: placingDeviceId,
        x,
        y,
        rack: placeRack || undefined,
        zone: placeZone || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Could not place device");
      return;
    }
    const pin = (await res.json()) as FloorPin;
    setPlacements((prev) => {
      const without = prev.filter((p) => p.device.id !== pin.device.id);
      return [...without, pin];
    });
    setPlacingDeviceId(null);
    setPlaceRack("");
    setPlaceZone("");
    setSelectedId(pin.id);
    toast.success(`Placed ${pin.device.hostname}`);
    await loadBuildings();
  }

  function movePin(placementId: string, x: number, y: number) {
    setPlacements((prev) => prev.map((p) => (p.id === placementId ? { ...p, x, y } : p)));
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(async () => {
      await fetch(`/api/floors/placements/${placementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
    }, 250);
  }

  async function removePin(id: string) {
    const res = await fetch(`/api/floors/placements/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove pin");
      return;
    }
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    await loadBuildings();
  }

  async function saveSelectedMeta(rack: string, zone: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/floors/placements/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rack: rack || null, zone: zone || null }),
    });
    if (!res.ok) {
      toast.error("Could not update rack/zone");
      return;
    }
    const pin = (await res.json()) as FloorPin;
    setPlacements((prev) => prev.map((p) => (p.id === pin.id ? pin : p)));
    toast.success("Rack / zone saved");
  }

  const selectedPin = placements.find((p) => p.id === selectedId) ?? null;
  const imageUrl = floor?.has_image && floorId ? `/api/floors/${floorId}/image?t=${Date.now()}` : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buildings & floors</CardTitle>
            <CardDescription>Organize sites by building, then floor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-xs text-muted-foreground">
              Building
              <select
                className={selectClass}
                value={buildingId}
                onChange={(event) => {
                  setBuildingId(event.target.value);
                  const next = buildings.find((b) => b.id === event.target.value);
                  setFloorId(next?.floors[0]?.id ?? "");
                }}
              >
                <option value="">Select…</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>

            {currentBuilding && (
              <label className="block space-y-1 text-xs text-muted-foreground">
                Floor
                <select
                  className={selectClass}
                  value={floorId}
                  onChange={(event) => setFloorId(event.target.value)}
                >
                  <option value="">Select…</option>
                  {currentBuilding.floors.map((item) => (
                    <option key={item.id} value={item.id}>
                      L{item.level} · {item.name} ({item._count.placements})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {canWrite && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {buildingId ? "Edit building" : "New building"}
                </p>
                <Input placeholder="Building name" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
                <Input
                  placeholder="Address (optional)"
                  value={buildingAddress}
                  onChange={(e) => setBuildingAddress(e.target.value)}
                />
                {buildingId ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="flex-1" onClick={() => void saveBuilding()}>
                      Save building
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void deleteBuilding()}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="sm" className="w-full" onClick={() => void createBuilding()}>
                    Add building
                  </Button>
                )}
                {buildingId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setBuildingId("");
                      setFloorId("");
                      setBuildingName("");
                      setBuildingAddress("");
                    }}
                  >
                    Clear selection · new building
                  </Button>
                )}

                <p className="pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {floorId ? "Edit floor" : "New floor"}
                </p>
                <Input
                  placeholder="Floor name"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  disabled={!buildingId}
                />
                <Input
                  type="number"
                  placeholder="Level"
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(e.target.value)}
                  disabled={!buildingId}
                />
                {floorId ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => void saveFloor()}>
                      Save floor
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void deleteFloor()}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!buildingId}
                    onClick={() => void createFloor()}
                  >
                    Add floor
                  </Button>
                )}
                {floorId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    disabled={!buildingId}
                    onClick={() => {
                      setFloorId("");
                      setFloorName("");
                      setFloorLevel("0");
                    }}
                  >
                    Clear floor · add another
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {floor ? `${floor.building.name} · ${floor.name}` : "Floor plan"}
                </CardTitle>
                <CardDescription>
                  {loading
                    ? "Loading…"
                    : floor
                      ? "Click the plan to place a selected device. Drag pins to adjust."
                      : "Select or create a floor to begin."}
                </CardDescription>
              </div>
              {canWrite && floor && (
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                      event.target.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    Upload plan
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void deleteFloor()}>
                    Delete floor
                  </Button>
                </div>
              )}
              {floor && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
                  Heat map
                </label>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {canWrite && floor && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block max-w-md space-y-1 text-xs text-muted-foreground">
                    Device to place
                    <select
                      className={selectClass}
                      value={placingDeviceId ?? ""}
                      onChange={(event) => setPlacingDeviceId(event.target.value || null)}
                    >
                      <option value="">Select device, then click the plan…</option>
                      {availableDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.hostname} · {device.ip}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Zone
                    <Input className="w-[120px]" value={placeZone} onChange={(e) => setPlaceZone(e.target.value)} placeholder="A / Wing" />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Rack
                    <Input className="w-[120px]" value={placeRack} onChange={(e) => setPlaceRack(e.target.value)} placeholder="R12" />
                  </label>
                </div>
              )}

              <FloorPlanCanvas
                imageUrl={imageUrl}
                placements={placements}
                canWrite={canWrite}
                placingDeviceId={placingDeviceId}
                onPlace={(x, y) => void placeAt(x, y)}
                onMove={movePin}
                onSelect={setSelectedId}
                selectedId={selectedId}
                showHeat={showHeat}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Placed devices</CardTitle>
              <CardDescription>{placements.length} on this floor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PlacementList
                placements={placements}
                selectedId={selectedId}
                canWrite={canWrite}
                onSelect={setSelectedId}
                onRemove={(id) => void removePin(id)}
              />
              {canWrite && selectedPin && (
                <SelectedPinMeta
                  key={selectedPin.id}
                  pin={selectedPin}
                  onSave={(rack, zone) => void saveSelectedMeta(rack, zone)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
