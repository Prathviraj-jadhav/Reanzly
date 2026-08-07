"use client";

import { create } from "zustand";
import type {
  Lead,
  Deal,
  Account,
  Contact,
  Activity,
  DealStage,
  LeadStatus,
  ActivityType,
  LeadSource,
  AccountType,
  ContractStatus,
} from "./_data";

// ============================================================
// CRM store - real, database-backed (GET/POST/PATCH against
// /api/crm/{leads,deals,accounts,contacts,activities}), replacing the
// previous Zustand+localStorage `reanzly-crm` persisted slice. Public
// field/mutator names are kept identical to the old store where possible so
// existing consumers (pipeline/leads/accounts/contacts/activities/reports
// .tsx) need minimal changes - only the create/update mutators become
// async (they now return the real created/updated record, or null on
// failure, instead of a synchronous void that always "succeeded").
// ============================================================

interface CrmState {
  leads: Lead[];
  deals: Deal[];
  accounts: Account[];
  contacts: Contact[];
  activities: Activity[];
  loaded: boolean;
  hydrate: () => Promise<void>;

  addLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<boolean>;
  setLeadStatus: (id: string, status: LeadStatus) => Promise<boolean>;
  convertLeadToDeal: (leadId: string, deal: Partial<Deal>) => Promise<Deal | null>;

  addDeal: (deal: Partial<Deal>) => Promise<Deal | null>;
  updateDeal: (id: string, patch: Partial<Deal>) => Promise<boolean>;
  moveDealStage: (id: string, stage: DealStage) => Promise<boolean>;

  addAccount: (account: Partial<Account>) => Promise<Account | null>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<boolean>;

  addContact: (contact: Partial<Contact>) => Promise<Contact | null>;
  updateContact: (id: string, patch: Partial<Contact>) => Promise<boolean>;

  addActivity: (activity: Partial<Activity>) => Promise<Activity | null>;
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<boolean>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function patchJSON(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
}

export const useCrmStore = create<CrmState>()((set, get) => ({
  leads: [],
  deals: [],
  accounts: [],
  contacts: [],
  activities: [],
  loaded: false,

  hydrate: async () => {
    try {
      const [leadsRes, dealsRes, accountsRes, contactsRes, activitiesRes] = await Promise.all([
        fetch("/api/crm/leads").then((r) => (r.ok ? r.json() : { leads: [] })),
        fetch("/api/crm/deals").then((r) => (r.ok ? r.json() : { deals: [] })),
        fetch("/api/crm/accounts").then((r) => (r.ok ? r.json() : { accounts: [] })),
        fetch("/api/crm/contacts").then((r) => (r.ok ? r.json() : { contacts: [] })),
        fetch("/api/crm/activities").then((r) => (r.ok ? r.json() : { activities: [] })),
      ]);
      set({
        leads: leadsRes.leads ?? [],
        deals: dealsRes.deals ?? [],
        accounts: accountsRes.accounts ?? [],
        contacts: contactsRes.contacts ?? [],
        activities: activitiesRes.activities ?? [],
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  addLead: async (lead) => {
    const res = await postJSON<{ lead: Lead }>("/api/crm/leads", lead);
    if (!res) return null;
    set((s) => ({ leads: [res.lead, ...s.leads] }));
    return res.lead;
  },
  updateLead: async (id, patch) => {
    const ok = await patchJSON(`/api/crm/leads/${id}`, patch);
    if (ok) set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    return ok;
  },
  setLeadStatus: async (id, status) => get().updateLead(id, { status }),
  convertLeadToDeal: async (leadId, deal) => {
    const created = await get().addDeal({ ...deal, leadId });
    if (created) {
      await get().updateLead(leadId, { status: "Converted" });
    }
    return created;
  },

  addDeal: async (deal) => {
    const res = await postJSON<{ deal: Deal }>("/api/crm/deals", deal);
    if (!res) return null;
    set((s) => ({ deals: [res.deal, ...s.deals] }));
    return res.deal;
  },
  updateDeal: async (id, patch) => {
    const ok = await patchJSON(`/api/crm/deals/${id}`, patch);
    if (ok) set((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
    return ok;
  },
  moveDealStage: async (id, stage) => get().updateDeal(id, { stage }),

  addAccount: async (account) => {
    const res = await postJSON<{ account: Account }>("/api/crm/accounts", account);
    if (!res) return null;
    set((s) => ({ accounts: [res.account, ...s.accounts] }));
    return res.account;
  },
  updateAccount: async (id, patch) => {
    const ok = await patchJSON(`/api/crm/accounts/${id}`, patch);
    if (ok) set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    return ok;
  },

  addContact: async (contact) => {
    const res = await postJSON<{ contact: Contact }>("/api/crm/contacts", contact);
    if (!res) return null;
    set((s) => ({ contacts: [res.contact, ...s.contacts] }));
    return res.contact;
  },
  updateContact: async (id, patch) => {
    const ok = await patchJSON(`/api/crm/contacts/${id}`, patch);
    if (ok) set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    return ok;
  },

  addActivity: async (activity) => {
    const res = await postJSON<{ activity: Activity }>("/api/crm/activities", activity);
    if (!res) return null;
    set((s) => ({ activities: [res.activity, ...s.activities] }));
    return res.activity;
  },
  updateActivity: async (id, patch) => {
    const ok = await patchJSON(`/api/crm/activities/${id}`, patch);
    if (ok) set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    return ok;
  },
}));

// ===== Convenience exports for components that don't need reactive subscriptions =====
export type {
  Lead,
  Deal,
  Account,
  Contact,
  Activity,
  DealStage,
  LeadStatus,
  ActivityType,
  LeadSource,
  AccountType,
  ContractStatus,
};
