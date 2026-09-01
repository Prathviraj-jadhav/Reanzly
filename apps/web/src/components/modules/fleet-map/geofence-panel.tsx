"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Plus,
  Circle,
  Square,
  ChevronDown,
  MapPin,
  Bell,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  GEOFENCES,
  GEOFENCE_BREACHES,
  CITY_LATLNG,
  cityToLatLng,
  type Geofence,
  relativeTime,
} from "./_helpers";

interface GeofencePanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GeofencePanel({ open, onOpenChange }: GeofencePanelProps) {
  const [tab, setTab] = useState<"zones" | "breaches">("zones");
  const [draftName, setDraftName] = useState("");
  const [draftCity, setDraftCity] = useState("Mumbai");
  const [draftShape, setDraftShape] = useState<"circle" | "polygon">("circle");
  const [draftAlert, setDraftAlert] = useState("Entry + Exit alert to dispatch");
  const [breaches, setBreaches] = useState(GEOFENCE_BREACHES);
  const [zones, setZones] = useState<Geofence[]>(GEOFENCES);

  function ackBreach(id: string) {
    setBreaches((prev) => prev.map((b) => (b.id === id ? { ...b, acknowledged: true } : b)));
    toast.success("Breach acknowledged", { description: "Notification cleared from dispatch queue." });
  }

  function ackAll() {
    setBreaches((prev) => prev.map((b) => ({ ...b, acknowledged: true })));
    toast.success("All breaches acknowledged");
  }

  function createGeofence() {
    if (!draftName.trim()) {
      toast.error("Geofence name required");
      return;
    }
    const centerLL = cityToLatLng(draftCity);
    const newZone: Geofence = {
      id: `gf-${Date.now()}`,
      name: draftName.trim(),
      type: draftShape,
      centerLatLng: draftShape === "circle" ? centerLL : undefined,
      radiusMeters: draftShape === "circle" ? 3000 : undefined,
      pointsLatLng:
        draftShape === "polygon"
          ? [
              [centerLL[0] - 0.12, centerLL[1] - 0.12],
              [centerLL[0] - 0.12, centerLL[1] + 0.12],
              [centerLL[0] + 0.12, centerLL[1] + 0.12],
              [centerLL[0] + 0.12, centerLL[1] - 0.12],
            ]
          : undefined,
      city: draftCity,
      status: "Draft",
      alertRule: draftAlert || "No alerts configured",
      vehiclesInside: 0,
      breaches: 0,
      createdAt: new Date().toISOString(),
    };
    setZones((prev) => [newZone, ...prev]);
    toast.success(`Geofence "${newZone.name}" created`, {
      description: `${draftShape === "circle" ? "Circular" : "Polygon"} zone at ${draftCity}. Drawing mode exited.`,
    });
    setDraftName("");
    onOpenChange(false);
  }

  function toggleStatus(id: string) {
    setZones((prev) =>
      prev.map((z) =>
        z.id === id
          ? { ...z, status: z.status === "Active" ? "Paused" : "Active" }
          : z
      )
    );
  }

  const unackCount = breaches.filter((b) => !b.acknowledged).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-[15px] font-medium">
            <Shield className="h-4 w-4" />
            <span>Geofences</span>
          </SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground">
            Manage geofenced zones, alert rules, and breach events.
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-3 pt-2">
          <TabBtn active={tab === "zones"} onClick={() => setTab("zones")}>
            Zones
            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular text-muted-foreground">
              {zones.length}
            </span>
          </TabBtn>
          <TabBtn active={tab === "breaches"} onClick={() => setTab("breaches")}>
            Breaches
            {unackCount > 0 && (
              <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] tabular text-background">
                {unackCount}
              </span>
            )}
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {tab === "zones" ? (
            <div className="flex flex-col gap-3 p-3">
              {/* Create geofence block */}
              <div className="rounded-[6px] border border-border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-[12px] font-medium text-foreground">Create Geofence</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Geofence name (e.g. Mumbai Yard)"
                    className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 items-center justify-between gap-1.5 rounded-[5px] border border-border bg-background px-2 text-[12px] text-foreground hover:bg-accent">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{draftCity}</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto scrollbar-thin">
                        {Object.keys(CITY_LATLNG).map((c) => (
                          <DropdownMenuItem key={c} onClick={() => setDraftCity(c)} className="text-[12px]">
                            {c}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 items-center justify-between gap-1.5 rounded-[5px] border border-border bg-background px-2 text-[12px] text-foreground hover:bg-accent">
                          {draftShape === "circle" ? <Circle className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                          <span className="capitalize">{draftShape}</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => setDraftShape("circle")} className="text-[12px]">
                          <Circle className="mr-2 h-3 w-3" /> Circle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDraftShape("polygon")} className="text-[12px]">
                          <Square className="mr-2 h-3 w-3" /> Polygon
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <input
                    value={draftAlert}
                    onChange={(e) => setDraftAlert(e.target.value)}
                    placeholder="Alert rule (e.g. Entry + Exit → dispatch)"
                    className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                  <button
                    onClick={createGeofence}
                    className="mt-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[12px] font-medium text-background hover:bg-foreground/90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create & Enter Drawing Mode</span>
                  </button>
                </div>
              </div>

              {/* Zone list */}
              <div className="flex flex-col gap-2">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-[6px] border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {z.type === "circle" ? (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Square className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="truncate text-[13px] font-medium text-foreground">{z.name}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{z.city}</span>
                          <span>·</span>
                          <span className="capitalize">{z.type}</span>
                          <span>·</span>
                          <span className="tabular">{z.vehiclesInside} inside</span>
                        </div>
                      </div>
                      <StatusBadge
                        variant={z.status === "Active" ? "solid" : z.status === "Paused" ? "outline" : "muted"}
                        pulse={z.status === "Active"}
                      >
                        {z.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 rounded-[5px] bg-muted px-2 py-1.5">
                      <Bell className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <div className="text-[11px] text-muted-foreground">{z.alertRule}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        <span className="tabular text-foreground font-medium">{z.breaches}</span> breaches · {relativeTime(z.createdAt)}
                      </span>
                      <button
                        onClick={() => toggleStatus(z.id)}
                        className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-border px-2 text-[11px] text-foreground hover:bg-accent"
                      >
                        {z.status === "Active" ? "Pause" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Recent geofence breaches
                </span>
                {unackCount > 0 && (
                  <button
                    onClick={ackAll}
                    className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-border px-2 text-[11px] text-foreground hover:bg-accent"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Ack all
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {breaches.length === 0 && (
                  <div className="rounded-[6px] border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
                    No breaches recorded.
                  </div>
                )}
                {breaches.map((b) => (
                  <div key={b.id} className="rounded-[6px] border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-foreground">
                            {b.event} · {b.geofenceName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {b.vehicleName} · <span className="font-mono">{b.licensePlate}</span>
                          </div>
                          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {b.city} · {relativeTime(b.timestamp)}
                          </div>
                        </div>
                      </div>
                      {b.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" /> Ack
                        </span>
                      ) : (
                        <button
                          onClick={() => ackBreach(b.id)}
                          className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-foreground px-2 text-[11px] font-medium text-background hover:bg-foreground/90"
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div className="border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CircleDot className="h-3 w-3" />
              <span className="tabular text-foreground font-medium">
                {zones.filter((z) => z.status === "Active").length}
              </span>
              <span>active zones</span>
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="tabular text-foreground font-medium">{unackCount}</span>
              <span>unacknowledged</span>
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px inline-flex h-8 items-center gap-1 border-b-2 px-2 text-[12px] font-medium transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
