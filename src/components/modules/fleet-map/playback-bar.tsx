"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, FastForward, History, X, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";
import { buildPlaybackPath, formatDateTime } from "./_helpers";

interface PlaybackBarProps {
  vehicles: Vehicle[];
  active: boolean;
  vehicleId: string | null;
  progress: number;
  speed: number; // multiplier 1x,2x,4x,8x
  dateRange: { start: string; end: string };
  onActivate: (v: boolean) => void;
  onSelectVehicle: (id: string) => void;
  onProgress: (p: number) => void;
  onSpeed: (s: number) => void;
  onDateRange: (r: { start: string; end: string }) => void;
}

const SPEED_OPTIONS = [1, 2, 4, 8];

export function PlaybackBar({
  vehicles,
  active,
  vehicleId,
  progress,
  speed,
  dateRange,
  onActivate,
  onSelectVehicle,
  onProgress,
  onSpeed,
  onDateRange,
}: PlaybackBarProps) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const path = selectedVehicle ? buildPlaybackPath(selectedVehicle) : [];

  // Tick playback forward. The interval also handles the "stop at end" check
  // so we don't need a separate setState-in-effect for that.
  useEffect(() => {
    if (!playing || !active) return;
    timerRef.current = setInterval(() => {
      const next = Math.min(1, progress + 0.004 * speed);
      onProgress(next);
      if (next >= 1) {
        setPlaying(false);
        toast.success("Playback complete", { description: "Reached end of trip history." });
      }
    }, 80);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, active, progress, speed, onProgress]);

  function togglePlay() {
    if (!active || !vehicleId) {
      toast.error("Select a vehicle first");
      return;
    }
    if (progress >= 1) {
      onProgress(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  function jump(delta: number) {
    if (!vehicleId) return;
    onProgress(Math.max(0, Math.min(1, progress + delta)));
  }

  function exitPlayback() {
    setPlaying(false);
    onActivate(false);
    onProgress(0);
    toast.info("Exited historical playback");
  }

  function selectVehicle(id: string) {
    onSelectVehicle(id);
    onProgress(0);
    setPlaying(false);
  }

  function quickRange(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    onDateRange({ start: start.toISOString(), end: end.toISOString() });
    toast.info(`Range set to last ${days} day${days > 1 ? "s" : ""}`);
  }

  // If playback not active, render the compact "Enter playback" trigger.
  if (!active) {
    return (
      <div className="flex items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Historical playback</span>
        <button
          onClick={() => {
            onActivate(true);
            toast.info("Historical playback enabled", {
              description: "Select a vehicle and date range, then press play.",
            });
          }}
          className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-accent"
        >
          <Play className="h-3 w-3" />
          <span>Enter playback</span>
        </button>
      </div>
    );
  }

  // Active playback bar - full controls
  return (
    <div className="flex flex-col gap-2 rounded-[6px] border border-border bg-card p-2.5">
      {/* Top row: vehicle + date + exit */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          <span>Playback</span>
        </div>

        {/* Vehicle selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex h-7 max-w-56 items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 text-[11px] text-foreground hover:bg-accent">
              <span className="truncate">
                {selectedVehicle ? selectedVehicle.name : "Select vehicle"}
              </span>
              {selectedVehicle && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {selectedVehicle.licensePlate}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto scrollbar-thin">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Active vehicles
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {vehicles.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => selectVehicle(v.id)}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="truncate">{v.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{v.licensePlate}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date range quick presets */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 text-[11px] text-foreground hover:bg-accent">
              <Calendar className="h-3 w-3" />
              <span className="tabular">
                {new Date(dateRange.start).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                {" → "}
                {new Date(dateRange.end).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Quick range
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => quickRange(1)} className="text-[12px]">Last 24 hours</DropdownMenuItem>
            <DropdownMenuItem onClick={() => quickRange(3)} className="text-[12px]">Last 3 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => quickRange(7)} className="text-[12px]">Last 7 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => quickRange(14)} className="text-[12px]">Last 14 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => quickRange(30)} className="text-[12px]">Last 30 days</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 p-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom range</label>
              <input
                type="date"
                value={dateRange.start.slice(0, 10)}
                onChange={(e) =>
                  onDateRange({
                    start: new Date(e.target.value).toISOString(),
                    end: dateRange.end,
                  })
                }
                className="h-7 rounded-[4px] border border-border bg-background px-2 text-[11px] text-foreground"
              />
              <input
                type="date"
                value={dateRange.end.slice(0, 10)}
                onChange={(e) =>
                  onDateRange({
                    start: dateRange.start,
                    end: new Date(e.target.value).toISOString(),
                  })
                }
                className="h-7 rounded-[4px] border border-border bg-background px-2 text-[11px] text-foreground"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status pill */}
        <span className="inline-flex h-7 items-center gap-1.5 rounded-[4px] bg-muted px-2 text-[11px] text-muted-foreground">
          <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${playing ? "bg-foreground" : "bg-muted-foreground"}`} />
          <span className="font-mono uppercase tracking-wider">{playing ? "Playing" : "Paused"}</span>
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={exitPlayback}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-border bg-background px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Bottom row: controls + scrubber */}
      <div className="flex items-center gap-3">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => jump(-0.05)}
            disabled={!vehicleId}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40"
            aria-label="Step backward"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!vehicleId}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => jump(0.05)}
            disabled={!vehicleId}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40"
            aria-label="Step forward"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex flex-1 items-center gap-2">
          <span className="w-12 text-right font-mono text-[10px] tabular text-muted-foreground">
            {fmtStamp(progress, dateRange.start, dateRange.end)}
          </span>
          <Slider
            value={[Math.round(progress * 100)]}
            max={100}
            min={0}
            step={1}
            onValueChange={(v) => onProgress(v[0] / 100)}
            disabled={!vehicleId}
            className="flex-1"
          />
          <span className="w-12 font-mono text-[10px] tabular text-muted-foreground">
            {fmtStamp(1, dateRange.start, dateRange.end)}
          </span>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1">
          <FastForward className="h-3 w-3 text-muted-foreground" />
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`h-6 rounded-[4px] px-1.5 text-[10px] font-mono tabular transition-colors ${
                speed === s
                  ? "bg-foreground text-background"
                  : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Path summary */}
      {selectedVehicle && path.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-1.5 text-[10px] text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">PATH</span>
          <span className="text-foreground">{path[0].city || selectedVehicle.location}</span>
          <span>→</span>
          <span className="text-foreground">{path[path.length - 1].city || selectedVehicle.location}</span>
          <span>·</span>
          <span className="tabular">{path.length} samples</span>
          <span>·</span>
          <span className="tabular">vehicle {selectedVehicle.id}</span>
          <span className="ml-auto font-mono uppercase tracking-wider text-muted-foreground">
            {formatDateTime(dateRange.start)} → {formatDateTime(dateRange.end)}
          </span>
        </div>
      )}
    </div>
  );
}

function fmtStamp(p: number, start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const t = s + (e - s) * p;
  return new Date(t).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
