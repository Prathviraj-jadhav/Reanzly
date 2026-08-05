"use client";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  CalendarCheck,
  Truck,
  Download,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { todaysDriverAttendance } from "./_helpers";

interface DriverAttendanceViewProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function DriverAttendanceView({ open, onOpenChange }: DriverAttendanceViewProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => todaysDriverAttendance(), []);
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.driverId.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    return {
      present: rows.filter((r) => r.status === "Present").length,
      absent: rows.filter((r) => r.status === "Absent").length,
      leave: rows.filter((r) => r.status === "On-Leave").length,
      trip: rows.filter((r) => r.status === "On-Trip").length,
    };
  }, [rows]);

  const badgeVariant = (status: string) =>
    status === "Present" ? "solid" : status === "On-Trip" ? "outline" : status === "On-Leave" ? "muted" : "muted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[6px] border border-border sm:max-w-[860px] gap-0 p-0">
        <DialogHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <CalendarCheck className="h-4 w-4" />
              Driver Attendance - Today
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
              {" · "}{rows.length} drivers on roster
            </DialogDescription>
          </div>
          <Btn
            variant="outline"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => toast("Attendance sheet exported", { description: "CSV file generated" })}
          >
            Export
          </Btn>
        </DialogHeader>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-3 sm:grid-cols-4">
          <KpiTile label="Present" value={summary.present} />
          <KpiTile label="On-Trip" value={summary.trip} />
          <KpiTile label="On-Leave" value={summary.leave} />
          <KpiTile label="Absent" value={summary.absent} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Check-In</th>
                <th className="px-3 py-2 font-medium">Check-Out</th>
                <th className="px-3 py-2 font-medium">Vehicle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.driverId} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[13px] text-foreground">{r.name}</span>
                      <span className="text-[11px] text-muted-foreground tabular">{r.driverId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge variant={badgeVariant(r.status)} pulse={r.status === "On-Trip"}>
                      {r.status}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.checkIn ? (
                      <span className="inline-flex items-center gap-1 text-[12px] tabular text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {r.checkIn}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.checkOut ? (
                      <span className="inline-flex items-center gap-1 text-[12px] tabular text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {r.checkOut}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.vehicle ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-foreground">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        {r.vehicle}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[12px] text-muted-foreground">
              No drivers match your search.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-[11px] text-muted-foreground">
            Attendance auto-syncs from the driver mobile app every 15 minutes.
          </span>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Close</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3 py-2")}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}
