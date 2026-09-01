"use client";

import { useMemo } from "react";
import { StatCard } from "@/components/shared/detail-layout";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import type { Driver } from "@/lib/types";
import { Truck, TrendingUp, Fuel, Clock, Star, Trophy } from "lucide-react";
import {
  driverSeed, generatePerformanceTrend,
} from "../_helpers";

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "5px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export function DriverPerformanceTab({ driver }: { driver: Driver }) {
  const seed = driverSeed(driver.id);
  const trend = useMemo(() => generatePerformanceTrend(driver.id), [driver.id]);

  const onTimeAvg = Math.round(trend.reduce((s, t) => s + t.onTime, 0) / trend.length);
  const fuelAvg = (trend.reduce((s, t) => s + t.fuelEff, 0) / trend.length).toFixed(1);
  const tripsTotal = trend.reduce((s, t) => s + t.trips, 0);
  const idleTotal = trend.reduce((s, t) => s + t.idleHours, 0);
  const ratingAvg = (trend.reduce((s, t) => s + t.rating, 0) / trend.length).toFixed(1);

  // Leaderboard rank (deterministic from seed)
  const rank = 1 + (seed % 12);
  const totalDrivers = 32;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Trips (6mo)" value={tripsTotal} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="On-Time Avg" value={`${onTimeAvg}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Fuel Avg" value={`${fuelAvg} km/L`} icon={<Fuel className="h-4 w-4" />} />
        <StatCard label="Idle Hours" value={idleTotal} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Rating Avg" value={ratingAvg} icon={<Star className="h-4 w-4" />} />
      </div>

      {/* Leaderboard rank */}
      <SectionCard title="Leaderboard Rank" icon={<Trophy className="h-4 w-4" />}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fleet rank</div>
            <div className="text-[24px] font-medium leading-none tabular text-foreground">
              #{rank}<span className="text-[14px] text-muted-foreground"> / {totalDrivers}</span>
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {rank <= 5 ? "Top quintile - keep it up." : rank <= 15 ? "Mid-pack. Room to climb." : "Bottom third. Review incentives."}
            </div>
          </div>
          <StatusBadge variant={rank <= 5 ? "solid" : rank <= 15 ? "outline" : "muted"}>
            {rank <= 5 ? "Top Performer" : rank <= 15 ? "Average" : "Below Average"}
          </StatusBadge>
        </div>
      </SectionCard>

      {/* Trips per month (bar) */}
      <SectionCard title="Trips per Month" icon={<Truck className="h-4 w-4" />}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={36} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="trips" fill="hsl(var(--foreground))" radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* On-time % trend (line) */}
        <SectionCard title="On-Time % Trend" icon={<TrendingUp className="h-4 w-4" />}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis domain={[60, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="onTime" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--foreground))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Fuel efficiency trend (line) */}
        <SectionCard title="Fuel Efficiency Trend" icon={<Fuel className="h-4 w-4" />}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis domain={[2.5, 6]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="fuelEff" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--foreground))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Idle hours (bar) */}
        <SectionCard title="Idle Hours" icon={<Clock className="h-4 w-4" />}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                <Bar dataKey="idleHours" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Rating trend (line) */}
        <SectionCard title="Rating Trend" icon={<Star className="h-4 w-4" />}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis domain={[3, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--foreground))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
