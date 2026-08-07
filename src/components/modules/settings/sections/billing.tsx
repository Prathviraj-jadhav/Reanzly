"use client";
import { useEffect, useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard, Check, Plus, Trash2, ShieldCheck, Calendar, Users, Truck, Database,
} from "lucide-react";

interface Plan {
  id: string; code: string; name: string; priceMonthly: number; priceAnnual: number;
  vehicleCap: number; userCap: number; storageMb: number; features: string[];
}
interface Subscription {
  id: string; status: string; billingCycle: string; startedAt: string; renewsAt?: string;
  mrr: number; plan: Plan;
}
interface PaymentMethod {
  id: string; brand: string; last4: string; expMonth: number; expYear: number;
  holderName: string; isDefault: boolean; addedOn: string;
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const CARD_BRANDS = ["Visa", "Mastercard", "RuPay", "Amex"];

export function BillingSection() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const load = () => {
    Promise.all([
      fetch("/api/billing/subscription").then((r) => (r.ok ? r.json() : { subscription: null })),
      fetch("/api/billing/plans").then((r) => (r.ok ? r.json() : { plans: [] })),
      fetch("/api/billing/payment-methods").then((r) => (r.ok ? r.json() : { paymentMethods: [] })),
    ])
      .then(([subRes, plansRes, pmRes]) => {
        setSubscription(subRes.subscription);
        setPlans(plansRes.plans ?? []);
        setPaymentMethods(pmRes.paymentMethods ?? []);
      })
      .catch(() => toast.error("Couldn't load billing info", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  const changePlan = async (planCode: string) => {
    const res = await fetch("/api/billing/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    if (res.ok) {
      const { subscription: sub } = await res.json();
      setSubscription(sub);
      setPlanPickerOpen(false);
      toast.success("Plan updated", { description: `Now on ${sub.plan.name}` });
    } else {
      toast.error("Couldn't change plan", { description: "Try again." });
    }
  };

  const removeCard = async (id: string) => {
    const res = await fetch(`/api/billing/payment-methods/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
      toast.success("Card removed");
    } else {
      toast.error("Couldn't remove card", { description: "Try again." });
    }
  };

  const makeDefault = async (id: string) => {
    const res = await fetch(`/api/billing/payment-methods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setPaymentMethods((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
      toast.success("Default card updated");
    } else {
      toast.error("Couldn't update default card", { description: "Try again." });
    }
  };

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading billing…</div>;
  }

  const trialDays = subscription?.status === "Trial" ? daysUntil(subscription.renewsAt) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-border pb-4">
        <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Billing & Plan</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Your organisation's subscription plan and payment method.</p>
      </div>

      {/* Current plan */}
      <div className="rounded-[6px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-medium text-foreground">{subscription?.plan.name ?? "No plan"}</h3>
              {subscription && (
                <StatusBadge variant={subscription.status === "Active" ? "solid" : subscription.status === "Trial" ? "outline" : "muted"}>
                  {subscription.status}
                </StatusBadge>
              )}
            </div>
            {subscription && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {formatINR(subscription.billingCycle === "annual" ? subscription.plan.priceAnnual : subscription.plan.priceMonthly)} / {subscription.billingCycle === "annual" ? "year" : "month"}
                {trialDays !== null && trialDays >= 0 && ` · trial ends in ${trialDays}d (${formatDate(subscription.renewsAt)})`}
              </p>
            )}
          </div>
          <Btn variant="outline" size="sm" onClick={() => setPlanPickerOpen(true)}>
            Change plan
          </Btn>
        </div>

        {subscription && (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">Up to {subscription.plan.vehicleCap} vehicles</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">Up to {subscription.plan.userCap} users</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">{Math.round(subscription.plan.storageMb / 1000)} GB storage</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment methods */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Payment Methods</h3>
          </div>
          <Btn variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddCardOpen(true)}>
            Add payment method
          </Btn>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-muted-foreground">
            No payment method on file yet. Add one to keep your data past the trial.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-11 items-center justify-center rounded-[4px] border border-border bg-accent/40 text-[10px] font-medium uppercase text-foreground">
                    {pm.brand.slice(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[13px] text-foreground">
                      <span>•••• {pm.last4}</span>
                      {pm.isDefault && <StatusBadge variant="solid">Default</StatusBadge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {pm.holderName} · Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!pm.isDefault && (
                    <Btn variant="ghost" size="sm" onClick={() => makeDefault(pm.id)}>
                      Make default
                    </Btn>
                  )}
                  <button
                    onClick={() => removeCard(pm.id)}
                    className="tap flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Remove card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2 border-t border-border bg-accent/20 px-4 py-2.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Only the card brand, last 4 digits, and expiry are stored - never a full card number or CVV.
          </p>
        </div>
      </div>

      {/* Change plan dialog */}
      <Dialog open={planPickerOpen} onOpenChange={setPlanPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a plan</DialogTitle>
            <DialogDescription>Changes apply immediately to your organisation's subscription.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = subscription?.plan.code === p.code;
              return (
                <div key={p.id} className={`rounded-[6px] border p-4 ${isCurrent ? "border-foreground" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-medium text-foreground">{p.name}</h4>
                    {isCurrent && <Check className="h-4 w-4 text-foreground" />}
                  </div>
                  <p className="mt-1 text-[18px] font-medium tabular text-foreground">{formatINR(p.priceMonthly)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></p>
                  <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    <li>Up to {p.vehicleCap} vehicles</li>
                    <li>Up to {p.userCap} users</li>
                    <li>{Math.round(p.storageMb / 1000)} GB storage</li>
                  </ul>
                  <Btn
                    variant={isCurrent ? "outline" : "primary"}
                    size="sm"
                    className="mt-3 w-full"
                    disabled={isCurrent}
                    onClick={() => changePlan(p.code)}
                  >
                    {isCurrent ? "Current plan" : "Switch to this plan"}
                  </Btn>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AddCardDialog
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onAdded={(pm) => {
          setPaymentMethods((prev) => [pm, ...prev.map((p) => (pm.isDefault ? { ...p, isDefault: false } : p))]);
          setAddCardOpen(false);
        }}
      />
    </div>
  );
}

function AddCardDialog({
  open, onClose, onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (pm: PaymentMethod) => void;
}) {
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [holderName, setHolderName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = /^\d{4}$/.test(last4) && Number(expMonth) >= 1 && Number(expMonth) <= 12 && Number(expYear) >= new Date().getFullYear() && holderName.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, last4, expMonth: Number(expMonth), expYear: Number(expYear), holderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Couldn't add card", { description: data.error || "Try again." });
        return;
      }
      toast.success("Payment method added", { description: `${brand} •••• ${last4}` });
      onAdded(data.paymentMethod);
      setLast4(""); setExpMonth(""); setExpYear(""); setHolderName("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
          <DialogDescription>
            We only ever ask for the last 4 digits - never your full card number or CVV.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="text-[12px]">Card brand</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARD_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Cardholder name</Label>
            <Input className="mt-1 h-9" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="As on card" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[12px]">Last 4 digits</Label>
              <Input className="mt-1 h-9" value={last4} maxLength={4} inputMode="numeric" onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4242" />
            </div>
            <div>
              <Label className="text-[12px]">Exp. month</Label>
              <Input className="mt-1 h-9" value={expMonth} maxLength={2} inputMode="numeric" onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="MM" />
            </div>
            <div>
              <Label className="text-[12px]">Exp. year</Label>
              <Input className="mt-1 h-9" value={expYear} maxLength={4} inputMode="numeric" onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="YYYY" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Btn variant="outline" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" disabled={!valid || submitting} onClick={submit}>
            {submitting ? "Adding…" : "Add card"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
