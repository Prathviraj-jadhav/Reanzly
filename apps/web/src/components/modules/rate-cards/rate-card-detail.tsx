"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { RateCard } from "@/lib/types";
import { EditRateCardDrawer } from "./edit-rate-card-drawer";
import { Pencil, Calculator, Copy, IndianRupee, Percent, Truck, Route as RouteIcon, Calendar, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SavageInput } from "@/components/shared/savage-input";
import { FieldLabel, formatINR, formatDate } from "./_helpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "calculator", label: "Calculate Freight" },
  { id: "audit", label: "Audit" },
];

interface RateCardDetailProps {
  rateCardId: string;
  rateCards: RateCard[];
  onEdit?: (rc: RateCard) => void;
  onUpdate: (id: string, patch: Partial<RateCard>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (rc: RateCard) => Promise<boolean>;
}

function statusVariant(status: RateCard["status"]): "solid" | "outline" | "muted" | "dot" {
  if (status === "Active") return "solid";
  if (status === "Draft") return "outline";
  return "muted";
}

export function RateCardDetail({ rateCardId, rateCards, onEdit, onUpdate, onDelete, onDuplicate }: RateCardDetailProps) {
    const { goToModule: navigate } = useAppNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const rateCard = rateCards.find((r) => r.id === rateCardId);

  // Calculator inputs
  const [calcQty, setCalcQty] = useState("1");
  const [calcDetention, setCalcDetention] = useState("0");

  const calc = useMemo(() => {
    if (!rateCard) return null;
    const qty = Number(calcQty) || 1;
    const det = Number(calcDetention) || 0;

    let base: number;
    switch (rateCard.rateType) {
      case "Per Km":
        base = rateCard.baseRate * qty;
        break;
      case "Per Tonne":
        base = rateCard.baseRate * (qty / 1000);
        break;
      case "Per Package":
        base = rateCard.baseRate * qty;
        break;
      case "Per Trip":
      default:
        base = rateCard.baseRate;
        break;
    }
    const surcharge = rateCard.surcharges.reduce((sum, s) => {
      if (s.type === "fixed") return sum + s.value;
      return sum + (base * s.value) / 100;
    }, 0);
    const detentionAmt = rateCard.detentionPerDay * det;
    const sub = base + surcharge + detentionAmt;
    const gst = rateCard.gstApplicable ? (sub * rateCard.gstRate) / 100 : 0;
    return {
      qty,
      base,
      surcharge,
      detentionAmt,
      gst,
      total: sub + gst,
    };
  }, [rateCard, calcQty, calcDetention]);

  if (!rateCard) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Rate card <span className="tabular">{rateCardId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("rate-cards")}>
          Back to Rate Cards
        </Btn>
      </div>
    );
  }

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => rateCard && (onEdit ? onEdit(rateCard) : setEditOpen(true))} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn
        variant="primary"
        icon={<Copy className="h-3.5 w-3.5" />}
        onClick={async () => {
          const ok = await onDuplicate(rateCard);
          if (!ok) return;
          toast.success("Rate card duplicated", { description: `${rateCard.name} (copy)` });
          navigate("rate-cards");
        }}
      >
        <span className="hidden sm:inline">Duplicate</span>
        <span className="sm:hidden">Copy</span>
      </Btn>
    </>
  );

  return (
    <>
    <DetailLayout
      title={rateCard.name}
      subtitle={`${rateCard.source} → ${rateCard.destination} · ${rateCard.vehicleType} · ${rateCard.loadType}`}
      badges={
        <>
          <StatusBadge variant={statusVariant(rateCard.status)}>{rateCard.status}</StatusBadge>
          <StatusBadge variant="muted">{rateCard.rateType}</StatusBadge>
          {rateCard.gstApplicable && (
            <StatusBadge variant="outline">GST {rateCard.gstRate}%</StatusBadge>
          )}
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1"><RouteIcon className="h-3 w-3" />{rateCard.source} → {rateCard.destination}</span>
          <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{rateCard.vehicleType}</span>
          <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{rateCard.loadType}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />From {formatDate(rateCard.effectiveFrom)}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={[
        { label: "Print", onClick: () => toast("Opening print view", { description: rateCard.name }) },
        { label: "Archive", onClick: () => toast(`Rate card ${rateCard.name} archived`) },
        {
          label: "Delete",
          onClick: async () => {
            const ok = await onDelete(rateCard.id);
            if (!ok) return;
            toast(`Rate card ${rateCard.name} deleted`);
            navigate("rate-cards");
          },
        },
      ]}
      lastUpdated={`Created by ${rateCard.createdBy} · last updated ${formatDate(rateCard.updatedAt)}`}
    >
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <InfoSection title="Pricing">
              <InfoRow label="Rate Type" value={rateCard.rateType} />
              <InfoRow label="Base Rate" value={`₹${rateCard.baseRate.toLocaleString("en-IN")} / ${rateCard.rateType.replace("Per ", "").toLowerCase()}`} mono />
              <InfoRow label="Detention Charges" value={rateCard.detentionPerDay ? `₹${rateCard.detentionPerDay.toLocaleString("en-IN")} / day` : "-"} mono />
              <InfoRow label="GST Applicable" value={rateCard.gstApplicable ? `Yes · ${rateCard.gstRate}%` : "No"} />
            </InfoSection>

            <InfoSection title="Surcharges">
              {rateCard.surcharges.length === 0 && (
                <div className="py-2 text-[12px] text-muted-foreground">No surcharges configured.</div>
              )}
              {rateCard.surcharges.map((s) => (
                <InfoRow
                  key={s.id}
                  label={s.name || "Unnamed surcharge"}
                  value={s.type === "fixed" ? `₹${s.value.toLocaleString("en-IN")} (fixed)` : `${s.value}% of base`}
                  mono
                />
              ))}
            </InfoSection>

            <InfoSection title="Lane & Vehicle">
              <InfoRow label="Source" value={rateCard.source} />
              <InfoRow label="Destination" value={rateCard.destination} />
              <InfoRow label="Vehicle Type" value={rateCard.vehicleType} />
              <InfoRow label="Load Type" value={rateCard.loadType} />
            </InfoSection>
          </div>

          <div className="flex flex-col gap-4">
            <StatCard
              label="Base Rate"
              value={`₹${rateCard.baseRate.toLocaleString("en-IN")}`}
              icon={<IndianRupee className="h-3.5 w-3.5" />}
              hint={`Per ${rateCard.rateType.replace("Per ", "").toLowerCase()}`}
            />
            <StatCard
              label="Surcharge Count"
              value={String(rateCard.surcharges.length)}
              icon={<Percent className="h-3.5 w-3.5" />}
              hint="Fixed + percent"
            />
            <StatCard
              label="Detention / Day"
              value={rateCard.detentionPerDay ? `₹${rateCard.detentionPerDay.toLocaleString("en-IN")}` : "-"}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="GST"
              value={rateCard.gstApplicable ? `${rateCard.gstRate}%` : "Nil"}
              icon={<Percent className="h-3.5 w-3.5" />}
              hint={rateCard.gstApplicable ? "Applied on subtotal" : "Not applicable"}
            />
          </div>
        </div>
      )}

      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-[13px] font-medium tracking-tight text-foreground">Freight Calculator</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <FieldLabel hint={rateCard.rateType === "Per Km" ? "km" : rateCard.rateType === "Per Tonne" ? "kg" : rateCard.rateType === "Per Package" ? "packages" : "ignored for Per Trip"}>
                  Quantity
                </FieldLabel>
                <SavageInput category="amount" type="number" value={calcQty}
                  onChange={(e) => setCalcQty(e.target.value)} />
              </div>
              <div>
                <FieldLabel hint="days">Detention Days</FieldLabel>
                <SavageInput category="amount" type="number" value={calcDetention}
                  onChange={(e) => setCalcDetention(e.target.value)} />
              </div>
            </div>
          </div>

          {calc && (
            <div className="rounded-[6px] border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cost Breakdown</span>
              </div>
              <div className="divide-y divide-border">
                <BreakdownRow label="Base Amount" value={formatINR(calc.base)} />
                <BreakdownRow label="Surcharges" value={formatINR(calc.surcharge)} />
                <BreakdownRow label="Detention" value={formatINR(calc.detentionAmt)} hint={`${calc.qty || 0} qty · ${Number(calcDetention) || 0} days`} />
                {rateCard.gstApplicable && (
                  <BreakdownRow label={`GST (${rateCard.gstRate}%)`} value={formatINR(calc.gst)} />
                )}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Freight</span>
                  <span className="tabular text-[18px] font-medium text-foreground">{formatINR(calc.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="flex flex-col gap-4">
          <InfoSection title="System">
            <InfoRow label="Created By" value={rateCard.createdBy} />
            <InfoRow label="Created At" value={formatDate(rateCard.createdAt)} mono />
            <InfoRow label="Last Updated" value={formatDate(rateCard.updatedAt)} mono />
            <InfoRow label="Effective From" value={formatDate(rateCard.effectiveFrom)} mono />
            <InfoRow label="Effective To" value={rateCard.effectiveTo ? formatDate(rateCard.effectiveTo) : "-"} mono />
            <InfoRow label="Status" value={rateCard.status} />
          </InfoSection>
        </div>
      )}
    </DetailLayout>

      {/* Inline edit drawer - used when no `onEdit` callback is passed
          (e.g. when the detail page is opened standalone without the
          parent module managing the drawer state). */}
      {!onEdit && (
        <EditRateCardDrawer
          open={editOpen}
          rateCard={rateCard}
          onClose={() => setEditOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

function BreakdownRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex flex-col">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
      </div>
      <span className="tabular text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
