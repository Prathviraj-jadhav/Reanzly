"use client";

import { useState, useRef, useEffect } from "react";
import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import type { WarehouseTaskStatus } from "@/lib/store/warehouse-field-store";
import { fileToCapturedPhoto, formatBytes } from "@/lib/photo";
import { useWarehouseFieldTasks, taskKindLabel, taskStatusColor, type WarehouseTaskKind } from "./_helpers";
import {
  PackagePlus,
  ClipboardList,
  Truck,
  Camera,
  X,
  Check,
  Loader2,
  RotateCcw,
  Upload,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RESULT_OPTIONS: WarehouseTaskStatus[] = ["In Progress", "Completed", "Exception"];

export function WarehouseFieldCapture() {
  const tasks = useWarehouseFieldTasks();
  const { taskStatus, activeTaskId, setTaskStatus, addActivity } = useWarehouseFieldStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ full: string; thumb: string; bytes: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [skuInput, setSkuInput] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<WarehouseTaskStatus>("Completed");
  const fileRef = useRef<HTMLInputElement>(null);

  const openTasks = tasks.filter((t) => (taskStatus[t.id] || t.defaultStatus) !== "Completed");
  const task = tasks.find((t) => t.id === selectedTaskId) || null;

  // If a task is already active on the Home/Tasks tab, default to it here too.
  useEffect(() => {
    if (!selectedTaskId && activeTaskId && openTasks.some((t) => t.id === activeTaskId)) {
      setSelectedTaskId(activeTaskId);
    }
  }, [activeTaskId]);

  function resetForm() {
    setPhoto(null);
    setSkuInput("");
    setQty("");
    setNote("");
    setResult("Completed");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const captured = await fileToCapturedPhoto(file);
      if (captured) {
        setPhoto({ full: captured.full, thumb: captured.thumb, bytes: captured.bytes });
      } else {
        toast.error("Could not process image. Try another photo.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit() {
    if (!task) return;
    setTaskStatus(task.id, result);
    addActivity({
      type: result === "Exception" ? "EXCEPTION" : "SCAN",
      taskId: task.id,
      taskKind: task.kind,
      refId: task.refId,
      payload: {
        sku: skuInput.trim() || undefined,
        qty: Number(qty) || undefined,
        status: result,
      },
      photoDataUrl: photo?.full,
      note: note.trim() || undefined,
    });

    toast.success(`${task.refId} saved`, {
      description: `${taskKindLabel(task.kind)} · marked ${result}`,
    });

    setSelectedTaskId(null);
    resetForm();
  }

  // ===== Task picker =====
  if (!task) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-[18px] font-semibold tracking-tight">Capture</h1>
          <p className="text-[12px] text-muted-foreground">
            Pick a task to confirm with SKU scan + photo.
          </p>
        </header>
        {openTasks.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border p-8 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-[13px] font-medium">All caught up</p>
            <p className="text-[11px] text-muted-foreground">
              No open tasks need confirmation right now.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((t) => {
              const status = taskStatus[t.id] || t.defaultStatus;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedTaskId(t.id)}
                    className="flex w-full items-center gap-3 rounded-[6px] border border-border bg-background p-3 text-left transition-colors hover:bg-accent/30 active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border">
                      <TaskKindIcon kind={t.kind} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold tabular-nums">{t.refId}</p>
                        <span
                          className={cn(
                            "rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            taskStatusColor(status)
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {t.title} · {t.subtitle}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // ===== Capture form =====
  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTaskId(null);
              resetForm();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border hover:bg-accent"
            aria-label="Back"
          >
            <X className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight">
              {taskKindLabel(task.kind)} · {task.refId}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {task.title} · {task.subtitle}
            </p>
          </div>
        </div>
        <TaskKindIcon kind={task.kind} large />
      </header>

      {/* SKU / barcode entry - manual text stands in for a scanner */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          SKU / Barcode
        </label>
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="Scan or type SKU code"
            className="h-11 w-full rounded-[5px] border border-border bg-background pl-9 pr-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {task.skuCount} SKUs · {task.totalQty} units on this task
        </p>
      </section>

      {/* Qty confirmed */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Quantity confirmed
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={String(task.totalQty)}
          className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] font-medium tabular-nums outline-none focus:border-foreground"
        />
      </section>

      {/* Photo capture */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Photo (optional)
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

      {/* Result */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Mark task as
        </label>
        <div className="flex flex-wrap gap-1.5">
          {RESULT_OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setResult(o)}
              className={cn(
                "h-9 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
                result === o
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </section>

      {/* Note */}
      <section>
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add any context - shortage, damage, bin location, etc."
          className="w-full rounded-[5px] border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-foreground"
        />
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-foreground text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check className="h-5 w-5" />
        Save Confirmation
      </button>
      <p className="text-center text-[10px] text-muted-foreground">
        Saved to device and reflected in Tasks instantly.
      </p>
    </div>
  );
}

function TaskKindIcon({ kind, large }: { kind: WarehouseTaskKind; large?: boolean }) {
  const Icon = kind === "putaway" ? PackagePlus : kind === "pick" ? ClipboardList : Truck;
  return <Icon className={large ? "h-5 w-5 text-muted-foreground" : "h-4 w-4"} />;
}
