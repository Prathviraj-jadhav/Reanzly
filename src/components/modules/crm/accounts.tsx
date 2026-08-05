"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Building2,
  TrendingUp,
  AlertCircle,
  FileText,
  MapPin,
  Phone,
  Mail,
  Truck,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCrmStore } from "./_store";
import {
  CRM_OWNERS,
  type Account,
  type AccountType,
  type ContractStatus,
} from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  contractStatusBadge,
  FieldLabel,
} from "./_helpers";

const ACCOUNT_TYPES: AccountType[] = ["Shipper", "Consignee", "Broker", "3PL"];
const CONTRACT_STATUSES: ContractStatus[] = [
  "Active",
  "Under Renewal",
  "Expired",
  "None",
];

export function Accounts() {
  const accounts = useCrmStore((s) => s.accounts);
  const contacts = useCrmStore((s) => s.contacts);
  const deals = useCrmStore((s) => s.deals);
  const [selected, setSelected] = useState<Account | null>(null);

  // KPIs
  const totalRevenue = accounts.reduce((s, a) => s + a.revenueYTD, 0);
  const totalOutstanding = accounts.reduce((s, a) => s + a.outstanding, 0);
  const activeContracts = accounts.filter((a) => a.contractStatus === "Active").length;
  const renewalsDue = accounts.filter((a) => a.contractStatus === "Under Renewal" || a.contractStatus === "Expired").length;

  const columns: Column<Account>[] = [
    {
      key: "accountId",
      header: "Account",
      sortable: true,
      sortValue: (a) => a.name,
      render: (a) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground">{a.name}</span>
          <span className="font-mono text-[10px] tabular text-muted-foreground">{a.accountId}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (a) => a.type,
      hideOnMobile: true,
      render: (a) => <StatusBadge variant="muted">{a.type}</StatusBadge>,
    },
    {
      key: "gstin",
      header: "GSTIN",
      sortable: true,
      sortValue: (a) => a.gstin,
      hideOnMobile: true,
      render: (a) => (
        <span className="font-mono text-[11px] tabular text-muted-foreground">{a.gstin}</span>
      ),
    },
    {
      key: "lanes",
      header: "Lanes",
      hideOnMobile: true,
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {a.lanes.slice(0, 2).map((l) => (
            <StatusBadge key={l} variant="outline">
              {l}
            </StatusBadge>
          ))}
          {a.lanes.length > 2 && (
            <StatusBadge variant="muted">+{a.lanes.length - 2}</StatusBadge>
          )}
        </div>
      ),
    },
    {
      key: "revenueYTD",
      header: "Revenue YTD",
      sortable: true,
      sortValue: (a) => a.revenueYTD,
      align: "right",
      render: (a) => (
        <span className="text-[12.5px] tabular font-medium text-foreground">
          {formatINRCompact(a.revenueYTD)}
        </span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      sortable: true,
      sortValue: (a) => a.outstanding,
      align: "right",
      hideOnMobile: true,
      render: (a) => (
        <span
          className={cn(
            "text-[12.5px] tabular",
            a.outstanding > 1000000 ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {a.outstanding > 0 ? formatINRCompact(a.outstanding) : "-"}
        </span>
      ),
    },
    {
      key: "contractStatus",
      header: "Contract",
      sortable: true,
      sortValue: (a) => a.contractStatus,
      render: (a) => {
        const { variant, pulse } = contractStatusBadge(a.contractStatus);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {a.contractStatus}
          </StatusBadge>
        );
      },
    },
    {
      key: "accountManager",
      header: "AM",
      sortable: true,
      sortValue: (a) => a.accountManager,
      hideOnMobile: true,
      render: (a) => <span className="text-[12px] text-foreground">{a.accountManager}</span>,
    },
    {
      key: "lastShipment",
      header: "Last Shipment",
      sortable: true,
      sortValue: (a) => a.lastShipment,
      hideOnMobile: true,
      render: (a) => (
        <span className="text-[11px] tabular text-muted-foreground">
          {relativeTime(a.lastShipment)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini
          label="Total Revenue YTD"
          value={formatINRCompact(totalRevenue)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiMini
          label="Outstanding Receivables"
          value={formatINRCompact(totalOutstanding)}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
        />
        <KpiMini label="Active Contracts" value={String(activeContracts)} icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiMini label="Renewals Due" value={String(renewalsDue)} icon={<Building2 className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Accounts · {accounts.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Customer & business accounts with revenue, contract status, and assigned managers.
          </p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast.info("Add Account form", { description: "Multi-step onboarding will open here." })}>
          New Account
        </Btn>
      </div>

      <DataTable
        data={accounts}
        columns={columns}
        searchKeys={["accountId", "name", "gstin", "accountManager", "city"]}
        searchPlaceholder="Search accounts by name, GSTIN, manager…"
        filters={[
          {
            label: "Type",
            options: ["All", ...ACCOUNT_TYPES],
            accessor: (a) => a.type,
          },
          {
            label: "Contract",
            options: ["All", ...CONTRACT_STATUSES],
            accessor: (a) => a.contractStatus,
          },
          {
            label: "Manager",
            options: ["All", ...CRM_OWNERS],
            accessor: (a) => a.accountManager,
          },
        ]}
        onRowClick={(a) => setSelected(a)}
        rowActions={[
          {
            label: "View Details",
            onClick: (a) => setSelected(a),
          },
          {
            label: "Add Contact",
            onClick: (a) => toast.success("Contact form", { description: `Add contact for ${a.name}` }),
          },
          {
            label: "Send Quotation",
            onClick: (a) => toast.success("Quotation draft", { description: `Drafted for ${a.name}` }),
          },
          {
            label: "Record Payment",
            onClick: (a) => toast.success("Payment recorded", { description: `Against outstanding of ${a.name}` }),
          },
        ]}
        pageSize={15}
      />

      <AccountDetailDrawer
        account={selected}
        contacts={contacts.filter((c) => selected && c.accountId === selected.id)}
        deals={deals.filter((d) => selected && d.accountId === selected.id)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

function AccountDetailDrawer({
  account,
  contacts,
  deals,
  onClose,
}: {
  account: Account | null;
  contacts: { id: string; name: string; title: string; phone: string; email: string; decisionMaker: boolean }[];
  deals: { id: string; dealId: string; title: string; value: number; stage: string }[];
  onClose: () => void;
}) {
  return (
    <Sheet open={!!account} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        {account && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="outline" className="font-mono">
                  {account.accountId}
                </StatusBadge>
                <StatusBadge variant="muted">{account.type}</StatusBadge>
                <StatusBadge {...contractStatusBadge(account.contractStatus)}>
                  {account.contractStatus}
                </StatusBadge>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">
                {account.name}
              </SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {account.city} · {account.accountManager}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Profile */}
              <div className="grid grid-cols-2 gap-2">
                <DetailTile label="GSTIN" value={account.gstin} mono />
                <DetailTile label="Payment Terms" value={account.paymentTerms} />
                <DetailTile label="Credit Limit" value={formatINR(account.creditLimit)} mono />
                <DetailTile label="Onboarded" value={formatDate(account.onboardingDate)} />
                <DetailTile label="Phone" value={account.phone} icon={<Phone className="h-3 w-3" />} />
                <DetailTile label="Email" value={account.email} icon={<Mail className="h-3 w-3" />} />
              </div>

              <div className="mt-3 rounded-[5px] border border-border p-3 text-[12px] text-muted-foreground">
                <div className="mb-1 flex items-center gap-1.5 text-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    Billing Address
                  </span>
                </div>
                {account.billingAddress}
              </div>

              {/* Revenue / Outstanding tiles */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Revenue YTD
                  </div>
                  <div className="mt-1 text-[18px] font-medium tabular text-foreground">
                    {formatINR(account.revenueYTD)}
                  </div>
                </div>
                <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Outstanding
                  </div>
                  <div className="mt-1 text-[18px] font-medium tabular text-foreground">
                    {formatINR(account.outstanding)}
                  </div>
                </div>
              </div>

              {/* Lanes */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Served Lanes
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {account.lanes.map((l) => (
                    <StatusBadge key={l} variant="outline">
                      {l}
                    </StatusBadge>
                  ))}
                </div>
              </div>

              {/* Contacts */}
              <SectionCard
                title="Contacts"
                description={`${contacts.length} linked`}
                icon={<Building2 className="h-3.5 w-3.5" />}
                className="mt-4"
                bodyClassName="p-0"
              >
                <div className="divide-y divide-border">
                  {contacts.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                      No linked contacts
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <div className="text-[12.5px] font-medium text-foreground">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.title}</div>
                        </div>
                        {c.decisionMaker && <StatusBadge variant="solid">DM</StatusBadge>}
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              {/* Deals */}
              <SectionCard
                title="Linked Deals"
                description={`${deals.length} deals`}
                icon={<Truck className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-0"
              >
                <div className="divide-y divide-border">
                  {deals.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                      No deals yet
                    </div>
                  ) : (
                    deals.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-medium text-foreground">
                            {d.title}
                          </div>
                          <div className="font-mono text-[10px] tabular text-muted-foreground">
                            {d.dealId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant="muted">{d.stage}</StatusBadge>
                          <span className="text-[12px] tabular text-foreground">
                            {formatINRCompact(d.value)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              {/* Notes */}
              <div className="mt-4">
                <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Account Notes
                </h4>
                <div className="rounded-[5px] border border-border bg-muted/30 p-3 text-[12.5px] leading-relaxed text-foreground">
                  {account.notes}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailTile({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[5px] border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn("text-[12.5px] text-foreground", mono && "font-mono tabular")}>{value}</span>
    </div>
  );
}
