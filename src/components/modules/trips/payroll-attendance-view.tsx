"use client";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Search,
  CalendarRange,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  monthlyDriverAttendance,
  attendanceCodeLabel,
  type AttendanceCode,
} from "./_helpers";

interface PayrollAttendanceViewProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const CODE_STYLE: Record<AttendanceCode, string> = {
  P: "bg-foreground text-background",
  A: "border border-foreground bg-background text-foreground",
  L: "bg-muted text-muted-foreground",
  T: "bg-foreground/30 text-foreground",
};

export function PayrollAttendanceView({ open, onOpenChange }: PayrollAttendanceViewProps) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const data = useMemo(() => {
    // monthlyDriverAttendance uses current month; for cursor months we use
    // the same deterministic seed function so past/future months stay
    // stable per driver.
    return monthlyDriverAttendance();
  }, []);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.year && today.getMonth() === cursor.month;
  const todayDate = isCurrentMonth ? today.getDate() : daysInMonth;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter((d) => d.name.toLowerCase().includes(q) || d.driverId.toLowerCase().includes(q));
  }, [data, search]);

  // Totals per driver (P count, etc.)
  const totals = useMemo(() => {
    return filtered.map((d) => {
      const counts: Record<AttendanceCode, number> = { P: 0, A: 0, L: 0, T: 0 };
      d.days.forEach((c) => {
        counts[c] += 1;
      });
      return { driverId: d.driverId, counts };
    });
  }, [filtered]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goNextMonth = () => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[6px] border border-border sm:max-w-[1080px] gap-0 p-0">
        <DialogHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <CalendarRange className="h-4 w-4" />
              Payroll Attendance
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              Monthly matrix · drivers × days · P/A/L/T codes · per-driver totals.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goPrevMonth} />
            <span className="min-w-[120px] text-center text-[13px] font-medium tabular">{monthLabel}</span>
            <Btn variant="outline" size="sm" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={goNextMonth} />
            <Btn
              variant="outline"
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => toast("Payroll matrix exported", { description: `CSV for ${monthLabel}` })}
            >
              Export
            </Btn>
          </div>
        </DialogHeader>

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
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px]">
            {(["P", "A", "L", "T"] as AttendanceCode[]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1">
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-[3px] text-[10px] font-medium", CODE_STYLE[c])}>
                  {c}
                </span>
                <span className="text-muted-foreground">{attendanceCodeLabel(c)}</span>
              </span>
            ))}
          </div>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} drivers · {daysInMonth} days
          </div>
        </div>

        {/* Matrix */}
        <div className="max-h-[480px] overflow-auto scrollbar-thin">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border">
                <th className="sticky left-0 z-20 bg-background px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Driver
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === todayDate && isCurrentMonth;
                  const dow = new Date(cursor.year, cursor.month, day).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "px-1 py-1 text-center text-[10px] font-medium tabular",
                        isToday && "bg-foreground text-background",
                        isWeekend && !isToday && "text-muted-foreground/60",
                        !isWeekend && !isToday && "text-muted-foreground",
                      )}
                    >
                      {day}
                    </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-background px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  P · L · T
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d, idx) => {
                const t = totals[idx]?.counts ?? { P: 0, A: 0, L: 0, T: 0 };
                return (
                  <tr key={d.driverId} className="hover:bg-accent/20">
                    <td className="sticky left-0 z-10 bg-background px-5 py-1.5">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-foreground">{d.name}</span>
                        <span className="text-[10px] text-muted-foreground tabular">{d.driverId}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const code = d.days[i];
                      const isFuture = isCurrentMonth && day > todayDate;
                      const isToday = day === todayDate && isCurrentMonth;
                      return (
                        <td key={day} className="px-0.5 py-0.5 text-center">
                          <span
                            className={cn(
                              "inline-flex h-5 w-5 items-center justify-center rounded-[3px] text-[10px] font-medium tabular",
                              CODE_STYLE[code],
                              isFuture && "opacity-30",
                              isToday && "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                            )}
                            title={`${day} ${monthLabel} · ${attendanceCodeLabel(code)}`}
                          >
                            {code}
                          </span>
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-background px-3 py-1.5 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] tabular">
                        <span className="text-foreground font-medium">{t.P}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{t.L}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-foreground">{t.T}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[12px] text-muted-foreground">
              No drivers match your search.
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
          <StatusBadge variant="outline">
            {filtered.length} drivers
          </StatusBadge>
          <span className="text-[11px] text-muted-foreground">
            Codes: <span className="font-medium text-foreground">P</span> Present ·{" "}
            <span className="font-medium text-foreground">A</span> Absent ·{" "}
            <span className="font-medium text-foreground">L</span> On-Leave ·{" "}
            <span className="font-medium text-foreground">T</span> On-Trip
          </span>
          <div className="flex-1" />
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Close</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
