"use client";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Btn } from "@/components/shared/btn";
import { Autocomplete } from "@/components/shared/autocomplete";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route as RouteIcon, Calculator, MapPin } from "lucide-react";
import {
  getRouteCostBreakdown,
  formatINR,
  LOAD_TYPES,
  PER_KM_RATE,
  type EstimateVehicleType,
} from "./_helpers";

const VEHICLE_TYPE_OPTIONS: { value: EstimateVehicleType; label: string; rate: number }[] = [
  { value: "truck", label: "Truck", rate: PER_KM_RATE.truck },
  { value: "tanker", label: "Tanker", rate: PER_KM_RATE.tanker },
  { value: "refrigerated", label: "Refrigerated", rate: PER_KM_RATE.refrigerated },
];

interface RouteCostPlannerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function RouteCostPlannerDialog({ open, onOpenChange }: RouteCostPlannerDialogProps) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [loadType, setLoadType] = useState<string>("Full");
  const [vehicleType, setVehicleType] = useState<EstimateVehicleType>("truck");

  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => (r.ok ? r.json() : { trips: [] }))
      .then((data) => setTrips(data.trips ?? []))
      .catch(() => {});
  }, []);

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        trips.flatMap((t) => [t.origin, t.destination]),
      ),
    ).sort().map((c) => ({ value: c, label: c }));
  }, [trips]);

  const breakdown = useMemo(() => {
    if (!source.trim() || !destination.trim()) return null;
    return getRouteCostBreakdown(
      source.trim(),
      destination.trim(),
      loadType as "Full" | "Partial" | "Consolidated",
      vehicleType,
    );
  }, [source, destination, loadType, vehicleType]);

  // `estimate` is derived straight from the breakdown so we never store a
  // second source of truth (no set-state-in-effect). Keeping the name lets
  // the Save Estimate handler stay unchanged.
  const estimate = breakdown?.total ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[6px] border border-border sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <RouteIcon className="h-4 w-4" />
            Route Cost Planner
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Estimate based on configured rate cards and lane averages. Final cost confirmed at job order creation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[12px] text-muted-foreground">Source</Label>
            <Autocomplete
              value={source}
              onChange={setSource}
              options={cityOptions}
              placeholder="E.g. Mumbai"
              emptyText="No city found"
              className="mt-1 h-8"
              bare
            />
          </div>
          <div>
            <Label className="text-[12px] text-muted-foreground">Destination</Label>
            <Autocomplete
              value={destination}
              onChange={setDestination}
              options={CITY_OPTIONS}
              placeholder="Destination city"
              emptyText="No city found"
              className="mt-1 h-8"
              bare
            />
          </div>
          <div>
            <Label className="text-[12px] text-muted-foreground">Load Type</Label>
            <Select value={loadType} onValueChange={setLoadType}>
              <SelectTrigger className="mt-1 h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAD_TYPES.map((l) => (
                  <SelectItem key={l} value={l} className="text-[13px]">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px] text-muted-foreground">Vehicle Type</Label>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as EstimateVehicleType)}>
              <SelectTrigger className="mt-1 h-8 w-full rounded-[5px] border-border bg-background text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPE_OPTIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value} className="text-[13px]">
                    {v.label} · ₹{v.rate}/km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" />
              Estimated Freight
            </div>
            {estimate !== null && (
              <StatusBadge variant="outline">Estimate</StatusBadge>
            )}
          </div>

          {estimate === null ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">
                Select a source and destination to estimate the route cost.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-[28px] font-medium leading-none tracking-tight tabular text-foreground">
                {formatINR(estimate)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. distance</span>
                  <span className="tabular font-medium">{breakdown?.distanceKm.toLocaleString("en-IN")} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate/km</span>
                  <span className="tabular font-medium">{formatINR(breakdown?.ratePerKm ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Movement</span>
                  <span className="tabular font-medium">{formatINR(breakdown?.movementCost ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tolls</span>
                  <span className="tabular font-medium">{formatINR(breakdown?.tolls ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver allowance</span>
                  <span className="tabular font-medium">{formatINR(breakdown?.driverAllowance ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load adjustment</span>
                  <span className="tabular font-medium">{formatINR(breakdown?.loadAdjustment ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-medium capitalize">{breakdown?.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load type</span>
                  <span className="font-medium">{loadType}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Estimate based on configured rate cards and lane averages. Final cost confirmed at job order creation.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Close</Btn>
          <Btn
            variant="primary"
            disabled={estimate === null}
            onClick={() => {
              if (estimate === null) return;
              toast.success("Estimate saved", {
                description: `${source} → ${destination} · ${formatINR(estimate)}`,
              });
              onOpenChange(false);
            }}
          >
            Save Estimate
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

