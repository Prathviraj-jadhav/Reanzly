"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import type { Driver } from "@/lib/types";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  generateAttendance, ATTENDANCE_LABEL, type AttendanceCode, type AttendanceMatrix,
} from "../_helpers";

const CODE_STYLE: Record<AttendanceCode, { bg: string; fg: string }> = {
  P: { bg: "bg-foreground", fg: "text-background" },
  A: { bg: "bg-foreground/10", fg: "text-foreground" },
  L: { bg: "bg-muted", fg: "text-muted-foreground" },
  T: { bg: "bg-foreground/60", fg: "text-background" },
  WD: { bg: "bg-background", fg: "text-muted-foreground" },
};

export function DriverAttendanceTab({ driver }: { driver: Driver }) {
  const [monthsBack, setMonthsBack] = useState(0);
  const matrix: AttendanceMatrix = useMemo(
    () => generateAttendance(driver.id, monthsBack),
    [driver.id, monthsBack],
  );

  const today = new Date();
  const todayCode: AttendanceCode = useMemo(() => {
    const todayDay = new Date().getDate();
    const todayEntry = matrix.days.find((d) => d.date === todayDay);
    return todayEntry?.code ?? "P";
  }, [matrix]);

  const totalDays = matrix.days.length;
  const presentPct = Math.round((matrix.summary.P / totalDays) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Today's status + summary tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Today" value={ATTENDANCE_LABEL[todayCode]} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Present" value={matrix.summary.P} icon={<Calendar className="h-4 w-4" />} />
        <StatCard label="On Trip" value={matrix.summary.T} icon={<Calendar className="h-4 w-4" />} />
        <StatCard label="Leave" value={matrix.summary.L} icon={<Calendar className="h-4 w-4" />} />
        <StatCard label="Present %" value={`${presentPct}%`} icon={<Calendar className="h-4 w-4" />} />
      </div>

      {/* Monthly matrix */}
      <SectionCard
        title={`Attendance - ${matrix.monthLabel}`}
        icon={<Calendar className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-1">
            <Btn size="sm" variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={() => setMonthsBack((m) => m + 1)}>
              Prev
            </Btn>
            <Btn size="sm" variant="ghost" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={() => setMonthsBack((m) => Math.max(0, m - 1))} disabled={monthsBack === 0}>
              Next
            </Btn>
          </div>
        }
      >
        {/* Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {(Object.keys(ATTENDANCE_LABEL) as AttendanceCode[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={"inline-flex h-4 w-4 items-center justify-center rounded-[3px] text-[10px] font-medium " + CODE_STYLE[c].bg + " " + CODE_STYLE[c].fg}>
                {c}
              </span>
              {ATTENDANCE_LABEL[c]}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
          {matrix.days.map((d) => (
            <div
              key={d.date}
              title={`Day ${d.date} - ${ATTENDANCE_LABEL[d.code]}`}
              className={"flex aspect-square flex-col items-center justify-center rounded-[4px] border border-border text-[11px] tabular " + CODE_STYLE[d.code].bg + " " + CODE_STYLE[d.code].fg}
            >
              <span className="font-medium">{d.date}</span>
              <span className="text-[9px] opacity-80">{d.code}</span>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(["P", "T", "L", "A", "WD"] as AttendanceCode[]).map((c) => (
            <div key={c} className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className={"inline-flex h-4 w-4 items-center justify-center rounded-[3px] text-[10px] font-medium " + CODE_STYLE[c].bg + " " + CODE_STYLE[c].fg}>
                  {c}
                </span>
                {ATTENDANCE_LABEL[c]}
              </span>
              <span className="text-[14px] font-medium tabular text-foreground">{matrix.summary[c]}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Today card */}
      <SectionCard title="Today's Status" icon={<Clock className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={"inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-[14px] font-medium " + CODE_STYLE[todayCode].bg + " " + CODE_STYLE[todayCode].fg}>
              {todayCode}
            </span>
            <div>
              <div className="text-[14px] font-medium text-foreground">{ATTENDANCE_LABEL[todayCode]}</div>
              <div className="text-[12px] text-muted-foreground">
                {today.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn
              size="sm"
              variant="outline"
              onClick={() =>
                toast.success("Leave marked", { description: `${driver.name} marked on leave today` })
              }
            >
              Mark Leave
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              onClick={() =>
                toast.success("Check-in recorded", { description: `${driver.name} · ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` })
              }
            >
              Check-In
            </Btn>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
