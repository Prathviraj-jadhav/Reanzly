"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import type { Vehicle } from "@/lib/types";
import { Disc, Plus, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  formatNumber, formatINR, generateTyres, vehicleSeed, type TyreRecord,
} from "../_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLE: Record<TyreRecord["status"], { variant: "outline" | "solid" | "muted"; pulse?: boolean }> = {
  Good: { variant: "outline" },
  Worn: { variant: "muted" },
  Critical: { variant: "solid", pulse: true },
};

export function VehicleTyresTab({ vehicle }: { vehicle: Vehicle }) {
  const tyres = useMemo(
    () => generateTyres(vehicle.id, vehicle.currentMeter),
    [vehicle.id, vehicle.currentMeter],
  );
  const [editPos, setEditPos] = useState<TyreRecord | null>(null);

  const critical = tyres.filter((t) => t.status === "Critical").length;
  const worn = tyres.filter((t) => t.status === "Worn").length;
  const avgTread = (tyres.reduce((s, t) => s + t.treadDepth, 0) / tyres.length).toFixed(1);

  // Recap cost: total km on tyres / cost-per-km estimate - pure deterministic demo
  const seed = vehicleSeed(vehicle.id);
  const totalKmOnTyres = tyres.reduce((s, t) => s + (t.currentOdometer - t.odometerAtFitment), 0);
  const totalTyreCost = tyres.length * (8000 + (seed % 6) * 1200);
  const costPerKm = totalKmOnTyres > 0 ? (totalTyreCost / totalKmOnTyres) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Total Positions" value={String(tyres.length)} />
        <SummaryTile label="Avg Tread" value={`${avgTread} mm`} />
        <SummaryTile label="Worn" value={String(worn)} />
        <SummaryTile label="Critical" value={String(critical)} />
      </div>

      <SectionCard
        title="Tyre Position Diagram"
        icon={<Disc className="h-4 w-4" />}
        description="Tap a wheel position to inspect or edit. 6-wheel dual-rear config."
      >
        <TyreDiagram tyres={tyres} onSelect={setEditPos} />
      </SectionCard>

      <SectionCard
        title="Tyre Inventory"
        icon={<Disc className="h-4 w-4" />}
        description={`Cost per km (recap): ₹${costPerKm.toFixed(2)} · total spend ${formatINR(totalTyreCost)}`}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {["Position", "Brand", "Tread", "Pressure", "KM on Tyre", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tyres.map((t) => {
                const kmOn = t.currentOdometer - t.odometerAtFitment;
                return (
                  <tr key={t.positionId} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[13px] font-medium text-foreground">{t.positionLabel}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{t.brand}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{t.treadDepth} mm</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{t.pressure} psi</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatNumber(kmOn)} km</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={STATUS_STYLE[t.status].variant} pulse={STATUS_STYLE[t.status].pulse}>
                        {t.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Btn size="xs" variant="ghost" icon={<Pencil className="h-3 w-3" />} onClick={() => setEditPos(t)}>
                        Edit
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <EditTyreDialog key={editPos?.positionId ?? "none"} tyre={editPos} onClose={() => setEditPos(null)} />
    </div>
  );
}

function TyreDiagram({ tyres, onSelect }: { tyres: TyreRecord[]; onSelect: (t: TyreRecord) => void }) {
  const byId = (id: string) => tyres.find((t) => t.positionId === id)!;
  const positions = [
    { id: "fl1", x: 50, y: 70, label: "FL" },
    { id: "fr1", x: 150, y: 70, label: "FR" },
    { id: "rl-outer", x: 50, y: 170, label: "RL-O" },
    { id: "rl-inner", x: 80, y: 170, label: "RL-I" },
    { id: "rr-outer", x: 120, y: 170, label: "RR-I" },
    { id: "rr-inner", x: 150, y: 170, label: "RR-O" },
  ];

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 200 240" className="h-auto w-full max-w-[420px]">
        {/* Chassis */}
        <rect x="30" y="50" width="140" height="150" rx="4" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Axle lines */}
        <line x1="50" y1="80" x2="150" y2="80" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="50" y1="170" x2="150" y2="170" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 2" />
        {/* Cab label */}
        <text x="100" y="40" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, monospace">CAB</text>
        <text x="100" y="225" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, monospace">REAR (dual)</text>

        {positions.map((p) => {
          const t = byId(p.id);
          const fill =
            t.status === "Critical" ? "hsl(var(--foreground))" :
            t.status === "Worn" ? "hsl(var(--muted-foreground))" :
            "hsl(var(--background))";
          const textFill =
            t.status === "Critical" ? "hsl(var(--background))" :
            t.status === "Worn" ? "hsl(var(--background))" :
            "hsl(var(--foreground))";
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => onSelect(t)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={18}
                fill={fill}
                stroke="hsl(var(--border))"
                strokeWidth={1.5}
              />
              <text x={p.x} y={p.y - 1} textAnchor="middle" fontSize="7" fill={textFill} fontFamily="ui-monospace, monospace">{p.label}</text>
              <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize="6" fill={textFill} fontFamily="ui-monospace, monospace">{t.treadDepth}mm</text>
              {t.status === "Critical" && (
                <circle cx={p.x + 14} cy={p.y - 14} r="3" fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth="1" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EditTyreDialog({ tyre, onClose }: { tyre: TyreRecord | null; onClose: () => void }) {
  const [brand, setBrand] = useState(tyre?.brand ?? "");
  const [tread, setTread] = useState(tyre ? String(tyre.treadDepth) : "");
  const [pressure, setPressure] = useState(tyre ? String(tyre.pressure) : "");
  const [status, setStatus] = useState(tyre?.status ?? "");

  // Form is re-seeded via the `key` prop on this component (React-recommended
  // pattern for resetting state when a prop changes), so no effect needed here.

  if (!tyre) return null;

  const submit = () => {
    toast.success("Tyre updated", {
      description: `${tyre.positionLabel} → ${brand} · ${tread} mm · ${pressure} psi`,
    });
    onClose();
  };

  return (
    <Dialog open={!!tyre} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium">Edit Tyre - {tyre.positionLabel}</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Update tread, pressure, or replace tyre.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Brand</label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                {["Apollo", "MRF", "CEAT", "JK Tyre", "Bridgestone", "Goodyear"].map((b) => (
                  <SelectItem key={b} value={b} className="text-[13px]">{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Tread (mm)</label>
              <SavageInput category="amount" inputMode="decimal" value={tread} onChange={(e) => setTread(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Pressure (psi)</label>
              <SavageInput category="amount" inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {["Good", "Worn", "Critical"].map((s) => (
                  <SelectItem key={s} value={s} className="text-[13px]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Notes</label>
            <SavageTextarea category="remarks" rows={2} className="text-[13px]" />
          </div>
          {tyre.status === "Critical" && (
            <div className="flex items-start gap-2 rounded-[5px] border border-foreground/30 bg-background p-2.5 text-[12px] text-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Critical tread. Replace immediately - below 4mm safety threshold.</span>
            </div>
          )}
          {tyre.status === "Good" && (
            <div className="flex items-start gap-2 rounded-[5px] border border-border bg-background p-2.5 text-[12px] text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Within spec. Next rotation due in ~10,000 km.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submit}>Save</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[16px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}
