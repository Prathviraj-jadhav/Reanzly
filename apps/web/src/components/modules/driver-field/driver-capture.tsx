"use client";

import { useState, useRef, useEffect } from "react";
import { useDriverStore, type DriverActivityType } from "@/lib/store/driver-store";
import { useDriverGeolocation } from "@/hooks/use-geolocation";
import { fileToCapturedPhoto, formatBytes } from "@/lib/photo";
import {
  CAPTURE_TYPES,
  EXPENSE_CATEGORIES,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITY,
  INSPECTION_RESULTS,
  formatINR,
} from "./_helpers";
import { useActiveTrip } from "./_helpers";
import {
  PackageCheck,
  Fuel,
  Receipt,
  AlertTriangle,
  ClipboardCheck,
  StickyNote,
  Camera,
  X,
  Check,
  MapPin,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICONS: Record<string, typeof Camera> = {
  PackageCheck,
  Fuel,
  Receipt,
  AlertTriangle,
  ClipboardCheck,
  StickyNote,
};

export function DriverCapture() {
  const [selectedType, setSelectedType] = useState<DriverActivityType | null>(null);
  const [photo, setPhoto] = useState<{ full: string; thumb: string; bytes: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const trip = useActiveTrip();
  const { addActivity, trackingEnabled, vehicleId, activeTripId } = useDriverStore();

  // Live geo from the watch (if tracking enabled)
  const liveGeo = useDriverGeolocation(trackingEnabled && !!selectedType);

  useEffect(() => {
    if (liveGeo.fix) {
      setGeo({
        lat: liveGeo.fix.lat,
        lng: liveGeo.fix.lng,
        accuracy: liveGeo.fix.accuracy,
      });
    }
  }, [liveGeo.fix?.timestamp]);

  // Form state
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [litres, setLitres] = useState("");
  const [odometer, setOdometer] = useState("");
  const [station, setStation] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [result, setResult] = useState("");

  const activeConfig = CAPTURE_TYPES.find((c) => c.type === selectedType);

  // Reset form when switching type
  useEffect(() => {
    setPhoto(null);
    setNote("");
    setAmount("");
    setLitres("");
    setOdometer("");
    setStation("");
    setCategory("");
    setSeverity("");
    setResult("");
    setGeo(null);
  }, [selectedType]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const captured = await fileToCapturedPhoto(file);
      if (captured) {
        setPhoto({ full: captured.full, thumb: captured.thumb, bytes: captured.bytes });
        // Try to fetch a fresh geo fix for the photo
        if (!liveGeo.fix) {
          setFetchingGeo(true);
          const fix = await liveGeo.captureFixNow();
          if (fix) setGeo({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
          setFetchingGeo(false);
        }
      } else {
        toast.error("Could not process image. Try another photo.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function fetchGeoNow() {
    setFetchingGeo(true);
    const fix = await liveGeo.captureFixNow();
    if (fix) {
      setGeo({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      toast.success("Location captured");
    } else {
      toast.error("Could not get current location. Check GPS/permission.");
    }
    setFetchingGeo(false);
  }

  function handleSubmit() {
    if (!selectedType || !activeConfig) return;
    const payload: Record<string, unknown> = {};
    for (const f of activeConfig.fields) {
      if (f === "amount") payload.amount = Number(amount) || 0;
      if (f === "litres") payload.litres = Number(litres) || 0;
      if (f === "odometer") payload.odometer = Number(odometer) || 0;
      if (f === "station") payload.station = station;
      if (f === "category") payload.category = category;
      if (f === "severity") payload.severity = severity;
      if (f === "result") payload.result = result;
    }
    if (selectedType === "STATUS_UPDATE") payload.status = "Captured";

    addActivity({
      type: selectedType,
      tripId: activeTripId || trip?.id,
      vehicleId,
      payload,
      photoDataUrl: photo?.full,
      lat: geo?.lat,
      lng: geo?.lng,
      accuracy: geo?.accuracy,
      note: note.trim() || undefined,
    });

    toast.success(`${activeConfig.label} saved`, {
      description: photo ? "Photo + location attached" : undefined,
    });

    // Reset
    setSelectedType(null);
    setPhoto(null);
    setNote("");
    setAmount("");
    setLitres("");
    setOdometer("");
    setStation("");
    setCategory("");
    setSeverity("");
    setResult("");
    setGeo(null);
  }

  // ===== Type picker =====
  if (!selectedType) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-[18px] font-semibold tracking-tight">Capture</h1>
          <p className="text-[12px] text-muted-foreground">
            Photo + GPS are auto-attached to every record.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {CAPTURE_TYPES.map((c) => {
            const Icon = ICONS[c.icon] || Camera;
            return (
              <button
                key={c.type}
                onClick={() => setSelectedType(c.type)}
                className="flex flex-col items-start gap-2 rounded-[6px] border border-border bg-background p-4 text-left transition-colors hover:bg-accent/30 active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">{c.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== Capture form =====
  const Icon = ICONS[activeConfig!.icon] || Camera;
  const requiredFilled = activeConfig!.fields.every((f) => {
    if (f === "amount") return !!amount;
    if (f === "litres") return !!litres;
    if (f === "odometer") return !!odometer;
    if (f === "station") return !!station;
    if (f === "category") return !!category;
    if (f === "severity") return !!severity;
    if (f === "result") return !!result;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedType(null)}
            className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border hover:bg-accent"
            aria-label="Back"
          >
            <X className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight">{activeConfig!.label}</h1>
            <p className="text-[11px] text-muted-foreground">{activeConfig!.desc}</p>
          </div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </header>

      {/* Trip context */}
      {trip && (
        <div className="rounded-[6px] border border-border bg-accent/20 px-3 py-2 text-[11px]">
          <span className="text-muted-foreground">Trip: </span>
          <span className="font-semibold tabular-nums">{trip.tripId}</span>
          <span className="text-muted-foreground"> · {trip.origin} → {trip.destination}</span>
        </div>
      )}

      {/* Photo capture */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Photo {activeConfig!.type === "POD" || activeConfig!.type === "INSPECTION" ? "(required)" : "(optional)"}
        </label>
        {photo ? (
          <div className="relative overflow-hidden rounded-[6px] border border-border">
            <img src={photo.full} alt="capture" className="aspect-[4/3] w-full object-cover" />
            <button
              onClick={() => setPhoto(null)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/90 text-background backdrop-blur"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-foreground/85 px-3 py-1.5 text-[10px] font-medium text-background backdrop-blur">
              <span className="tabular-nums">{formatBytes(photo.bytes)}</span>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> Retake
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-border bg-accent/20 text-muted-foreground transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Camera className="h-7 w-7" />
                <span className="text-[12px] font-medium">Tap to take photo</span>
                <span className="flex items-center gap-1 text-[10px]">
                  <Upload className="h-3 w-3" /> or upload from gallery
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </section>

      {/* Location */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Location
        </label>
        <div className="flex items-center justify-between rounded-[6px] border border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {geo ? (
              <div>
                <p className="text-[12px] font-medium tabular-nums">
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  ±{geo.accuracy.toFixed(0)}m accuracy
                </p>
              </div>
            ) : fetchingGeo ? (
              <p className="text-[12px] text-muted-foreground">Acquiring GPS…</p>
            ) : (
              <p className="text-[12px] text-muted-foreground">No location yet</p>
            )}
          </div>
          <button
            onClick={fetchGeoNow}
            disabled={fetchingGeo || !!liveGeo.fix}
            className="flex h-7 items-center gap-1 rounded-[5px] border border-border px-2 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
          >
            {fetchingGeo ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
            {geo ? "Captured" : "Capture"}
          </button>
        </div>
      </section>

      {/* Type-specific fields */}
      {activeConfig!.fields.length > 0 && (
        <section className="space-y-3">
          {activeConfig!.fields.includes("amount") && (
            <Field label="Amount (₹)">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] font-medium tabular-nums outline-none focus:border-foreground"
              />
            </Field>
          )}
          {activeConfig!.fields.includes("litres") && (
            <Field label="Quantity (Litres)">
              <input
                type="number"
                inputMode="decimal"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0.00"
                className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] font-medium tabular-nums outline-none focus:border-foreground"
              />
            </Field>
          )}
          {activeConfig!.fields.includes("odometer") && (
            <Field label="Odometer (km)">
              <input
                type="number"
                inputMode="numeric"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] font-medium tabular-nums outline-none focus:border-foreground"
              />
            </Field>
          )}
          {activeConfig!.fields.includes("station") && (
            <Field label="Fuel Station">
              <input
                type="text"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="e.g. HP Pump, NH48"
                className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] outline-none focus:border-foreground"
              />
            </Field>
          )}
          {activeConfig!.fields.includes("category") && (
            <Field label="Category">
              <PillSelect
                options={activeConfig!.type === "EXPENSE" ? EXPENSE_CATEGORIES : ISSUE_CATEGORIES}
                value={category}
                onChange={setCategory}
              />
            </Field>
          )}
          {activeConfig!.fields.includes("severity") && (
            <Field label="Severity">
              <PillSelect options={ISSUE_SEVERITY} value={severity} onChange={setSeverity} />
            </Field>
          )}
          {activeConfig!.fields.includes("result") && (
            <Field label="Inspection Result">
              <PillSelect options={INSPECTION_RESULTS} value={result} onChange={setResult} />
            </Field>
          )}
        </section>
      )}

      {/* Note */}
      <section>
        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add any context - receiver name, delay reason, etc."
            className="w-full rounded-[5px] border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-foreground"
          />
        </Field>
      </section>

      {/* Preview amount for fuel/expense */}
      {activeConfig!.fields.includes("amount") && amount && (
        <div className="flex items-center justify-between rounded-[6px] border border-border bg-accent/20 px-3 py-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Record total</span>
          <span className="text-[16px] font-semibold tabular-nums">{formatINR(Number(amount) || 0)}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={
          uploading ||
          ((activeConfig!.type === "POD" || activeConfig!.type === "INSPECTION") && !photo) ||
          !requiredFilled
        }
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-foreground text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check className="h-5 w-5" />
        Save {activeConfig!.label}
      </button>
      <p className="text-center text-[10px] text-muted-foreground">
        Saved to device + synced to dispatch automatically.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PillSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-8 rounded-full border px-3 text-[12px] font-medium transition-colors",
            value === o
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
