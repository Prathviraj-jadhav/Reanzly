"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  ShieldCheck, CalendarCheck, Download, FileText, RefreshCw,
  CheckCircle2, AlertCircle, Clock, CalendarDays, Building2, Banknote,
  Filter, ChevronDown, Receipt, Landmark, Award,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  SEED_GST_RETURNS,
  SEED_TDS_RETURNS,
  SEED_LICENSES,
  COMPLIANCE_STATUSES,
  complianceStatusBadge,
  documentStatusBadge,
  type GstReturnRow,
  type TdsReturnRow,
  type LicenseValidityRow,
  type ComplianceStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  daysAhead,
  daysAgo,
  KpiTile,
} from "./_helpers";
import { useBrokerComplianceData, BrokerTaxReturnDTO, BrokerLicenseDTO } from "./use-broker-compliance-data";

/* ============================================================
   BrokerCompliance - broker compliance dashboard.
   ------------------------------------------------------------
   Single source of truth for statutory filings:
   â€¢ GST returns (GSTR-1 + GSTR-3B) for last 6 quarters
   â€¢ TDS quarterly returns (26Q for non-salary, 24Q for salary)
   â€¢ Broker license validity (IRGT, GST, MSME, NACH, Trade License)
   Includes a calendar-style grid view + status tables.
   ============================================================ */

type View = "table" | "calendar";

export function BrokerCompliance() {
  const { taxReturns, licenses, fileTaxReturn, renewLicense: triggerRenew, loaded } = useBrokerComplianceData();
  const [view, setView] = useState<View>("table");
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "All">("All");

  const gstReturns = taxReturns.filter(r => r.taxType === "GST");
  const tdsReturns = taxReturns.filter(r => r.taxType === "TDS");

  // ===== Derived: GST returns =====
  const gstFiltered = useMemo(() => {
    if (statusFilter === "All") return gstReturns;
    return gstReturns.filter((r) => r.status === statusFilter);
  }, [statusFilter, gstReturns]);

  // Group GST by period for the calendar grid view.
  const gstByPeriod = useMemo(() => {
    const map = new Map<string, BrokerTaxReturnDTO[]>();
    for (const r of gstReturns) {
      const arr = map.get(r.period) ?? [];
      arr.push(r);
      map.set(r.period, arr);
    }
    return Array.from(map.entries());
  }, [gstReturns]);

  // ===== Derived: counts =====
  const filed = taxReturns.filter((r) => r.status === "Filed").length;
  const due = taxReturns.filter((r) => r.status === "Due").length;
  const overdue = taxReturns.filter((r) => r.status === "Overdue").length;
  const totalGstLiability = gstReturns
    .filter((r) => r.status !== "Filed")
    .reduce((s, r) => s + r.liabilityINR, 0);
  const totalTdsLiability = tdsReturns
    .filter((r) => r.status !== "Filed")
    .reduce((s, r) => s + r.liabilityINR, 0);

  // ===== License validity =====
  const validLicenses = licenses.filter((l) => l.status === "Valid").length;
  const expiringLicenses = licenses.filter((l) => l.status === "Expiring Soon").length;
  const expiredLicenses = licenses.filter((l) => l.status === "Expired").length;
  const nextExpiry = [...licenses]
    .filter((l) => new Date(l.expiresAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];

  // ===== Handlers =====
  const fileReturn = async (r: { id: string; formType?: string; period?: string; quarter?: string }) => {
    const ok = await fileTaxReturn(r.id);
    if (ok) {
      toastSuccess(
        "Return filed",
        `${r.formType ?? "Return"} for ${r.period ?? r.quarter ?? "period"} filed successfully.`,
      );
    }
  };

  const downloadAck = (r: { formType: string }) => {
    toastInfo("Downloading acknowledgment", `${r.formType} - ACK receipt PDF will be saved.`);
  };

  const renewLicense = async (l: BrokerLicenseDTO) => {
    const ok = await triggerRenew(l.id);
    if (ok) {
      toastInfo("Renewal initiated", `${l.licenseType} - renewal form sent to ${l.issuedBy}.`);
    }
  };

  // ===== GST columns =====
  const gstColumns: Column<BrokerTaxReturnDTO>[] = [
    {
      key: "formType",
      header: "Form",
      sortable: true,
      align: "left",
      sortValue: (r) => r.formType,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12.5px] font-medium text-foreground">{r.formType}</span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      align: "left",
      sortValue: (r) => r.period,
      render: (r) => (
        <div className="text-[12px]">
          <div className="text-foreground">{r.period}</div>
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      sortable: true,
      align: "left",
      sortValue: (r) => r.dueDate ?? "",
      render: (r) => (
        <div className="text-[12px] tabular">
          <div className="text-foreground">{formatDate(r.dueDate ?? undefined)}</div>
          <div className="text-[10px] text-muted-foreground">{relativeTime(r.dueDate ?? undefined)}</div>
        </div>
      ),
    },
    {
      key: "liability",
      header: "Liability",
      sortable: true,
      align: "right",
      sortValue: (r) => r.liabilityINR,
      hideable: true,
      render: (r) => (
        <span className="tabular text-foreground">
          {r.liabilityINR > 0 ? formatINR(r.liabilityINR) : "-"}
        </span>
      ),
    },
    {
      key: "ackNo",
      header: "Acknowledgment",
      align: "left",
      hideable: true,
      render: (r) => (
        <div className="text-[12px] tabular">
          {r.ackNo ? (
            <>
              <div className="text-foreground">{r.ackNo}</div>
              <div className="text-[10px] text-muted-foreground">{r.filedDate ? formatDate(r.filedDate) : ""}</div>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "left",
      sortValue: (r) => r.status,
      render: (r) => {
        const b = complianceStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status !== "Filed" && (
            <Btn variant="outline" size="sm" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => fileReturn(r)}>
              File now
            </Btn>
          )}
          {r.status === "Filed" && (
            <button
              onClick={() => downloadAck(r)}
              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Download acknowledgment"
              title="Download ACK"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ===== TDS columns =====
  const tdsColumns: Column<TdsReturnRow>[] = [
    {
      key: "formType",
      header: "Form",
      sortable: true,
      align: "left",
      sortValue: (r) => r.formType,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12.5px] font-medium text-foreground">{r.formType}</span>
        </div>
      ),
    },
    {
      key: "quarter",
      header: "Period",
      sortable: true,
      align: "left",
      sortValue: (r) => r.quarter,
      render: (r) => <span className="text-[12px] text-foreground">{r.quarter}</span>,
    },
    {
      key: "dueDate",
      header: "Due date",
      sortable: true,
      align: "left",
      sortValue: (r) => r.dueDate ?? "",
      render: (r) => (
        <div className="text-[12px] tabular">
          <div className="text-foreground">{formatDate(r.dueDate ?? undefined)}</div>
          <div className="text-[10px] text-muted-foreground">{relativeTime(r.dueDate ?? undefined)}</div>
        </div>
      ),
    },
    {
      key: "deducteeCount",
      header: "Deductees",
      sortable: true,
      align: "right",
      sortValue: (r) => r.deducteeCount ?? 0,
      hideable: true,
      render: (r) => <span className="tabular text-muted-foreground">{r.deducteeCount}</span>,
    },
    {
      key: "amount",
      header: "TDS amount",
      sortable: true,
      align: "right",
      sortValue: (r) => r.amountINR,
      render: (r) => <span className="tabular text-foreground">{formatINR(r.amountINR)}</span>,
    },
    {
      key: "ackNo",
      header: "Acknowledgment",
      align: "left",
      hideable: true,
      render: (r) => (
        <div className="text-[12px] tabular">
          {r.ackNo ? <span className="text-foreground">{r.ackNo}</span> : <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "left",
      sortValue: (r) => r.status,
      render: (r) => {
        const b = complianceStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status !== "Filed" && (
            <Btn variant="outline" size="sm" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => fileReturn(r)}>
              File now
            </Btn>
          )}
          {r.status === "Filed" && (
            <button
              onClick={() => downloadAck(r)}
              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Download acknowledgment"
              title="Download ACK"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Compliance"
        description="GST returns, TDS quarterly filings, and broker license validity - all in one place."
        meta={[
          { label: "Filed", value: filed },
          { label: "Due", value: due },
          { label: "Overdue", value: overdue },
          { label: "Liability", value: formatINRCompact(totalGstLiability + totalTdsLiability) },
        ]}
        actions={
          <Btn variant="outline" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => toastInfo("Refreshing status", "Syncing with GSTN portal...")}>
            Refresh status
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Filed returns" value={String(filed)} hint="GST + TDS" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Due returns" value={String(due)} hint="action required" />
        <KpiTile icon={<AlertCircle className="h-3.5 w-3.5" />} label="Overdue" value={String(overdue)} hint="penalty risk" />
        <KpiTile icon={<Receipt className="h-3.5 w-3.5" />} label="GST liability" value={formatINRCompact(totalGstLiability)} hint="unfiled periods" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="TDS liability" value={formatINRCompact(totalTdsLiability)} hint="unfiled quarters" />
        <KpiTile icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Licenses valid" value={`${validLicenses}/${SEED_LICENSES.length}`} hint={`${expiringLicenses} expiring Â· ${expiredLicenses} expired`} />
      </div>

      {/* Compliance score banner */}
      <div className="rounded-[6px] border border-border bg-foreground p-5 text-background">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-background/10">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-background/60">Compliance score</div>
              <div className="mt-0.5 text-[20px] font-medium leading-none tabular">
                {Math.round((filed / (filed + due + overdue)) * 100)}<span className="text-[14px] text-background/60">/100</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-background/80">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-background" />
              <span>{filed} filed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-background/40" />
              <span>{due} due</span>
            </div>
            {overdue > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-background/60" />
                <span>{overdue} overdue</span>
              </div>
            )}
            <div className="hidden text-background/60 sm:inline">Â·</div>
            <div className="text-background/60 tabular">Updated {relativeTime(daysAgo(0))}</div>
          </div>
        </div>
      </div>

      {/* GST returns - calendar or table */}
      <SectionCard
        title="GST returns"
        description="GSTR-1 (outward supplies) and GSTR-3B (summary) for the last 6 quarters."
        icon={<CalendarDays className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span>{statusFilter}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("All")} className="text-[13px]">All</DropdownMenuItem>
                {COMPLIANCE_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="inline-flex items-center gap-0.5 rounded-[5px] border border-border bg-muted/30 p-0.5">
              <button
                onClick={() => setView("table")}
                className={"tap flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[12px] font-medium transition-colors " + (view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                aria-pressed={view === "table"}
              >
                <FileText className="h-3 w-3" /> Table
              </button>
              <button
                onClick={() => setView("calendar")}
                className={"tap flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[12px] font-medium transition-colors " + (view === "calendar" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                aria-pressed={view === "calendar"}
              >
                <CalendarDays className="h-3 w-3" /> Calendar
              </button>
            </div>
          </div>
        }
        flush={view === "table"}
      >
        {view === "table" ? (
          <DataTable
            data={gstFiltered}
            columns={gstColumns}
            searchKeys={["formType", "period", "ackNo"]}
            searchPlaceholder="Search form, period, ACK..."
            pageSize={12}
            initialSort={{ key: "dueDate", dir: "desc" }}
            emptyTitle="No returns match"
            emptyDescription="Adjust your status filter or search query."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {gstByPeriod.map(([period, rows]) => (
              <div key={period} className="rounded-[6px] border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[12.5px] font-medium text-foreground">{period}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular">
                    due {formatDate(rows[0]?.dueDate ?? "")}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {rows.map((r) => {
                    const b = complianceStatusBadge(r.status);
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background text-muted-foreground">
                            <FileText className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-medium text-foreground">{r.formType}</div>
                            {r.liabilityINR > 0 && (
                              <div className="text-[10px] tabular text-muted-foreground">{formatINRCompact(r.liabilityINR)}</div>
                            )}
                          </div>
                        </div>
                        <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* TDS returns */}
      <SectionCard
        title="TDS returns"
        description="26Q (non-salary) and 24Q (salary) - quarterly TDS filings u/s 194H on broker commission."
        icon={<Receipt className="h-4 w-4" />}
        flush
      >
        <DataTable
          data={SEED_TDS_RETURNS}
          columns={tdsColumns}
          searchKeys={["formType", "quarter", "ackNo"]}
          searchPlaceholder="Search form, quarter..."
          pageSize={10}
          initialSort={{ key: "dueDate", dir: "desc" }}
          emptyTitle="No TDS returns"
          emptyDescription="TDS filings will appear here once you start deducting tax at source."
        />
      </SectionCard>

      {/* License validity */}
      <SectionCard
        title="License validity"
        description="Track renewals for every broker license and registration."
        icon={<ShieldCheck className="h-4 w-4" />}
        action={
          nextExpiry ? (
            <div className="flex items-center gap-2 rounded-[5px] border border-border bg-muted/30 px-2.5 py-1 text-[11px]">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Next expiry:</span>
              <span className="font-medium text-foreground">{nextExpiry.licenseType}</span>
              <span className="tabular text-muted-foreground">Â· {formatDate(nextExpiry.expiresAt)}</span>
            </div>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(licenses.length ? licenses : SEED_LICENSES.map((l) => ({
            id: l.id,
            licenseType: l.name,
            licenseNumber: l.referenceNo,
            issuedBy: l.issuingAuthority,
            expiresAt: l.expiresAt,
            status: (l.status === "Missing" ? "Expired" : l.status) as BrokerLicenseDTO["status"],
          }))).map((l) => {
            const b = documentStatusBadge(l.status);
            const daysLeft = Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86400000);
            return (
              <div
                key={l.id}
                className="flex flex-col gap-2.5 rounded-[6px] border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground">
                      {l.licenseType.toLowerCase().includes("gst") ? <Receipt className="h-4 w-4" /> :
                       l.licenseType.toLowerCase().includes("nach") ? <Banknote className="h-4 w-4" /> :
                       l.licenseType.toLowerCase().includes("trade") ? <Building2 className="h-4 w-4" /> :
                       <ShieldCheck className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium text-foreground">{l.licenseType}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{l.issuedBy}</div>
                    </div>
                  </div>
                  <StatusBadge variant={b.variant} pulse={b.pulse}>{l.status}</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reference</div>
                    <div className="mt-0.5 truncate text-foreground tabular">{l.licenseNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expires</div>
                    <div className="mt-0.5 text-foreground tabular">{formatDate(l.expiresAt)}</div>
                    <div className="text-[10px] text-muted-foreground tabular">
                      {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`}
                    </div>
                  </div>
                </div>
                {(l.status === "Expiring Soon" || l.status === "Expired") && (
                  <Btn variant="outline" size="sm" icon={<RefreshCw className="h-3 w-3" />} onClick={() => renewLicense(l)}>
                    Initiate renewal
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Auto-synced with GSTN + TRACES</span>
        <span>Â·</span>
        <span>TDS @ 1% u/s 194H on broker commission</span>
        <span>Â·</span>
        <span>IRGT renewal 30 days before expiry</span>
        <span>Â·</span>
        <span className="tabular">Last refreshed {relativeTime(daysAgo(0))}</span>
      </div>
    </div>
  );
}

export default BrokerCompliance;
