"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  LEADS,
  DEALS,
  ACCOUNTS,
  CONTACTS,
  ACTIVITIES,
  type Lead,
  type Deal,
  type Account,
  type Contact,
  type Activity,
  type DealStage,
  type LeadStatus,
  type ActivityType,
  type LeadSource,
  type AccountType,
  type ContractStatus,
} from "./_data";

// ============================================================
// CRM store - persisted Zustand slice for the CRM module.
// Store name: `reanzly-crm`
// ============================================================

interface CrmState {
  leads: Lead[];
  deals: Deal[];
  accounts: Account[];
  contacts: Contact[];
  activities: Activity[];

  // Lead mutations
  addLead: (lead: Lead) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  convertLeadToDeal: (leadId: string, deal: Deal) => void;

  // Deal mutations
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDealStage: (id: string, stage: DealStage) => void;

  // Account mutations
  addAccount: (account: Account) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;

  // Contact mutations
  addContact: (contact: Contact) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;

  // Activity mutations
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;

  // Reset to seed
  reset: () => void;
}

const SEED = {
  leads: LEADS,
  deals: DEALS,
  accounts: ACCOUNTS,
  contacts: CONTACTS,
  activities: ACTIVITIES,
};

export const useCrmStore = create<CrmState>()(
  persist(
    (set) => ({
      ...SEED,

      addLead: (lead) =>
        set((s) => ({ leads: [lead, ...s.leads] })),
      updateLead: (id, patch) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      setLeadStatus: (id, status) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)),
        })),
      convertLeadToDeal: (leadId, deal) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === leadId ? { ...l, status: "Converted" as LeadStatus } : l,
          ),
          deals: [deal, ...s.deals],
        })),

      addDeal: (deal) =>
        set((s) => ({ deals: [deal, ...s.deals] })),
      updateDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      moveDealStage: (id, stage) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, stage, probability: d.probability } : d)),
        })),

      addAccount: (account) =>
        set((s) => ({ accounts: [account, ...s.accounts] })),
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      addContact: (contact) =>
        set((s) => ({ contacts: [contact, ...s.contacts] })),
      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      addActivity: (activity) =>
        set((s) => ({ activities: [activity, ...s.activities] })),
      updateActivity: (id, patch) =>
        set((s) => ({
          activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      reset: () => set({ ...SEED }),
    }),
    {
      name: "reanzly-crm",
      version: 1,
    },
  ),
);

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
