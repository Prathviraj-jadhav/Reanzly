"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ===== Dashboard stats context =====
// One fetch to /api/dashboard/stats, shared by every widget on the grid -
// replacing each widget's own read of mock-data.ts arrays. Re-fetches when
// the active dashboard's location filter changes (the only filter with a
// real DB link - see the route's comment on branch/group).

export interface DashboardStats {
  generatedAt: string;
  location: string | null;
  trips: {
    activeCount: number; onTimePct: number; etaVarianceHrs: number;
    delayedShipments: { id: string; tripId: string; destination: string; expectedDelivery: string | null }[];
    statusMix: { status: string; count: number }[];
    recentActivities: { id: string; tripId: string; origin: string; destination: string; status: string; createdDate: string }[];
    routeProfitability: { route: string; trips: number; revenue: number; marginEstINR: number }[];
    avgTransitDays: number; totalDistanceKm: number;
  };
  vehicles: {
    total: number; active: number; idle: number; maintenance: number; offline: number;
    utilizationPct: number; systemCodesByType: { type: string; count: number }[];
  };
  fuel: { costPerKm: number; totalCost: number; efficiencyLeaders: { id: string; name: string; avgEfficiency: number }[] };
  invoices: {
    overdueCount: number; outstandingAmount: number; revenuePeriod: number; avgDaysToPay: number;
    agingBuckets: { name: string; count: number }[]; monthlyRevenue: { month: string; revenue: number }[];
  };
  customers: {
    pnl: { id: string; companyName: string; city: string; paymentTerms: string; revenue: number; outstanding: number }[];
    topDelinquent: { id: string; companyName: string; outstandingBalance: number; city: string }[];
  };
  issues: {
    openCount: number;
    criticalHigh: { id: string; issueId: string; title: string; vehicle: string; assignee: string; severity: string }[];
    bySeverity: { severity: string; count: number }[]; bySource: { source: string; count: number }[];
    recurringDefects: { reason: string; count: number }[]; incidentTrend: { month: string; count: number }[];
  };
  inspections: {
    failRate: number; passFail: { result: string; count: number }[];
    overdue: { id: string; inspectionId: string; vehicle: string; type: string; result: string }[];
    dueSoonCount: number;
  };
  workOrders: {
    openCount: number; avgTurnaroundHrs: number;
    recentUpdates: { id: string; workOrderId: string; title: string; vehicle: string; technician: string; status: string }[];
    recentCompleted: { id: string; workOrderId: string; title: string; vehicle: string; technician: string }[];
  };
  expenses: { categoryCounts: { category: string; count: number }[] };
  reminders: { upcoming: { id: string; name: string; entity: string; category: string; daysRemaining: number; status: string }[] };
  documents: {
    expiredCount: number; expiringSoonCount: number; validCount: number;
    expiryCalendar: { id: string; name: string; type: string; status: string; expiryDate: string | null }[];
    expiringLicenses: { id: string; name: string; licenseExpiry: string | null }[];
    filingsDueCount: number;
  };
  hr: {
    headcount: number; attendanceTodayPct: number; onLeaveToday: number;
    pendingLeavesCount: number;
    pendingLeavesList: { id: string; employeeName: string; designation: string; type: string; days: number; fromDate: string }[];
    attritionTrend: { month: string; count: number }[];
    payrollStatus: { month: string; status: string; netTotalINR: number } | null;
    openPositionsCount: number; pendingOffersCount: number;
    pendingOnboarding: { id: string; name: string; position: string; stage: string }[];
    driverCompliance: { id: string; name: string; licenseStatus: string; licenseExpiry: string | null }[];
  };
  branch: { revenue: number; trips: number; staff: number; onTimePct: number; issues: number };
  broker: { winRatePct: number; openLoads: { id: string; enquiryId: string; lane: string; customer: string; status: string }[] };
  tickets: { openCount: number; recent: { id: string; ticketNumber: string; subject: string; priority: string; status: string; createdAt: string }[] };
  superadmin: { totalOrgs: number; activeUsers24h: number };
}

interface DashboardStatsState {
  stats: DashboardStats | null;
  loaded: boolean;
  /** The location this result was fetched for - lets `loaded` derive back
   *  to false as soon as `location` changes, without a synchronous
   *  setState at the top of the effect (a lint-flagged React anti-pattern). */
  forLocation?: string;
}

const DashboardStatsContext = createContext<DashboardStatsState>({ stats: null, loaded: false });

export function DashboardStatsProvider({ location, children }: { location?: string; children: ReactNode }) {
  const [state, setState] = useState<DashboardStatsState>({ stats: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    const qs = location && location !== "All Locations" ? `?location=${encodeURIComponent(location)}` : "";
    fetch(`/api/dashboard/stats${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((stats: DashboardStats | null) => {
        if (!cancelled) setState({ stats, loaded: true, forLocation: location });
      })
      .catch(() => {
        if (!cancelled) setState({ stats: null, loaded: true, forLocation: location });
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  const loaded = state.loaded && state.forLocation === location;
  return <DashboardStatsContext.Provider value={{ stats: state.stats, loaded }}>{children}</DashboardStatsContext.Provider>;
}

/** Widgets call this instead of reading mock-data.ts arrays. `stats` is null
 *  while loading or on fetch failure - widgets should render a neutral
 *  fallback (0 / empty list) rather than throwing. */
export function useDashboardStats(): DashboardStatsState {
  return useContext(DashboardStatsContext);
}
