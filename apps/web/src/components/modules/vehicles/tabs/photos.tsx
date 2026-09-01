"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import type { Vehicle } from "@/lib/types";
import { Camera, Plus, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { generatePhotos, type VehiclePhoto, relativeTime } from "../_helpers";

const CATEGORY_BADGE: Record<VehiclePhoto["category"], "solid" | "outline" | "muted"> = {
  Front: "outline",
  Rear: "outline",
  Side: "muted",
  Interior: "muted",
  Damage: "solid",
};

export function VehiclePhotosTab({ vehicle }: { vehicle: Vehicle }) {
  const photos = useMemo(() => generatePhotos(vehicle.id), [vehicle.id]);
  const [active, setActive] = useState<VehiclePhoto | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Photo Gallery"
        icon={<Camera className="h-4 w-4" />}
        description={`${photos.length} photos · front, rear, sides, interior, damage close-ups`}
        action={
          <div className="flex items-center gap-1">
            <Btn size="sm" variant="ghost" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => toast("Camera capture opened")}>
              Capture
            </Btn>
            <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Photo upload opened")}>
              Upload
            </Btn>
          </div>
        }
      >
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-[13px] font-medium text-foreground">No photos uploaded</p>
            <p className="text-[12px] text-muted-foreground">Capture or upload photos to build this vehicle's visual record.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className="group relative flex aspect-[4/3] flex-col overflow-hidden rounded-[5px] border border-border bg-muted text-left transition-colors hover:border-foreground/30"
              >
                {/* SVG placeholder (no external image required) */}
                <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-muted to-background">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                  <span className="absolute left-2 top-2">
                    <StatusBadge variant={CATEGORY_BADGE[p.category]}>{p.category}</StatusBadge>
                  </span>
                </div>
                <div className="border-t border-border bg-background px-2 py-1.5">
                  <div className="truncate text-[12px] font-medium text-foreground">{p.label}</div>
                  <div className="truncate text-[10px] tabular text-muted-foreground">
                    {p.uploadedBy} · {relativeTime(p.uploadedAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-[720px] overflow-hidden rounded-[6px] border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActive(null)}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex aspect-[16/10] items-center justify-center bg-muted">
              <ImageIcon className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <div className="flex flex-col gap-1 border-t border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium text-foreground">{active.label}</span>
                <StatusBadge variant={CATEGORY_BADGE[active.category]}>{active.category}</StatusBadge>
              </div>
              <div className="text-[12px] tabular text-muted-foreground">
                Uploaded by {active.uploadedBy} · {relativeTime(active.uploadedAt)}
              </div>
              <div className="mt-2 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">{vehicle.name}</span> · {vehicle.licensePlate}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
