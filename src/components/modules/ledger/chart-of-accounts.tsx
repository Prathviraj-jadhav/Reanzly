"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookText, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useLedgerStore } from "@/lib/store/ledger-store";
import {
  GROUPS,
  SUBGROUPS,
  GROUP_FOR_SUBGROUP,
  ACCOUNT_GROUPS_META,
  type Account,
  type AccountGroup,
  type AccountSubgroup,
  type OpeningNature,
} from "./_data";
import {
  FieldLabel,
  formatINR,
  formatINRCompact,
  suggestAccountCode,
  defaultNatureForGroup,
  groupVariant,
} from "./_helpers";

/* ============================================================
   Chart of Accounts view.
   - KPI strip: counts by group (Asset / Liability / Equity / Income / Expense)
   - DataTable: code, name, group, subgroup, opening, nature
   - Add/Edit drawer: name, code auto-suggest, group select,
     subgroup select (filtered by group), opening balance, opening nature
   - Delete: refused if any entry references the account
   ============================================================ */

export function ChartOfAccountsView() {
  const accounts = useLedgerStore((s) => s.accounts);
  const entries = useLedgerStore((s) => s.entries);
  const addAccount = useLedgerStore((s) => s.addAccount);
  const updateAccount = useLedgerStore((s) => s.updateAccount);
  const deleteAccount = useLedgerStore((s) => s.deleteAccount);

  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccountState, setDeleteAccountState] = useState<Account | null>(null);

  // Group KPI counts
  const groupCounts = useMemo(() => {
    const map: Record<AccountGroup, { count: number; opening: number }> = {
      Asset: { count: 0, opening: 0 },
      Liability: { count: 0, opening: 0 },
      Equity: { count: 0, opening: 0 },
      Income: { count: 0, opening: 0 },
      Expense: { count: 0, opening: 0 },
    };
    for (const a of accounts) {
      map[a.group].count += 1;
      // opening sign by nature
      const signed = a.openingNature === "Dr" ? a.openingBalance : -a.openingBalance;
      map[a.group].opening += signed;
    }
    return map;
  }, [accounts]);

  // Detect accounts in use (cannot delete)
  const inUseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      for (const l of e.lines) ids.add(l.accountId);
    }
    return ids;
  }, [entries]);

  const columns: Column<Account>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      sortValue: (a) => a.code,
      width: "84px",
      render: (a) => (
        <span className="tabular text-[12px] text-muted-foreground">{a.code}</span>
      ),
    },
    {
      key: "name",
      header: "Account",
      sortable: true,
      sortValue: (a) => a.name.toLowerCase(),
      sticky: true,
      render: (a) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-medium text-foreground">{a.name}</span>
              {a.system && (
                <ShieldCheck className="h-3 w-3 text-muted-foreground" aria-label="System account" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">{a.subgroup}</div>
          </div>
        </div>
      ),
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      sortValue: (a) => a.group,
      hideOnMobile: true,
      render: (a) => (
        <StatusBadge variant={groupVariant(a.group)}>{a.group}</StatusBadge>
      ),
    },
    {
      key: "subgroup",
      header: "Subgroup",
      sortable: true,
      sortValue: (a) => a.subgroup,
      hideOnMobile: true,
      render: (a) => (
        <span className="text-[12px] text-muted-foreground">{a.subgroup}</span>
      ),
    },
    {
      key: "opening",
      header: "Opening",
      sortable: true,
      sortValue: (a) => a.openingBalance,
      align: "right",
      hideOnMobile: true,
      render: (a) => (
        <span className="tabular text-[13px] text-foreground">
          {formatINR(a.openingBalance)}
        </span>
      ),
    },
    {
      key: "nature",
      header: "Nature",
      align: "center",
      hideOnMobile: true,
      width: "72px",
      render: (a) => (
        <span
          className={cn(
            "tabular text-[11px] font-medium",
            a.openingNature === "Dr" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {a.openingNature}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Edit",
      onClick: (a: Account) => setEditAccount(a),
    },
    {
      label: "Delete",
      onClick: (a: Account) => {
        if (a.system) {
          toast.error("System account", {
            description: `${a.name} is a protected account and cannot be deleted.`,
          });
          return;
        }
        if (inUseIds.has(a.id)) {
          toast.error("Account in use", {
            description: "Existing journal entries reference this account. Remove the entries first.",
          });
          return;
        }
        setDeleteAccountState(a);
      },
      destructive: true,
    },
  ];

  const confirmDelete = () => {
    if (!deleteAccountState) return;
    deleteAccount(deleteAccountState.id);
    toast.success("Account deleted", {
      description: `${deleteAccountState.name} removed from the chart of accounts.`,
    });
    setDeleteAccountState(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Group KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ACCOUNT_GROUPS_META.map((g) => {
          const meta = groupCounts[g.label];
          return (
            <div
              key={g.label}
              className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {g.label}
                </span>
                <span className="text-[10px] tabular text-muted-foreground">
                  {meta.count}
                </span>
              </div>
              <span className="text-[15px] font-medium leading-none tracking-tight tabular text-foreground">
                {formatINRCompact(Math.abs(meta.opening))}
              </span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {g.description}
              </span>
            </div>
          );
        })}
      </div>

      <SectionCard
        title="Chart of Accounts"
        description="Master ledger accounts - one row per account. Used by every journal entry."
        icon={<BookText className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New Account
          </Btn>
        }
        flush
      >
        <DataTable
          data={accounts}
          columns={columns}
          searchKeys={["code", "name", "subgroup"]}
          searchPlaceholder="Search by code, name or subgroup…"
          rowActions={rowActions}
          onRowClick={(a) => setEditAccount(a)}
          pageSize={25}
          initialSort={{ key: "code", dir: "asc" }}
        />
      </SectionCard>

      <AccountDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => {
          addAccount(data);
          toast.success("Account created", {
            description: `${data.name} (${data.code}) added to the chart of accounts.`,
          });
          setAddOpen(false);
        }}
      />

      <AccountDrawer
        key={editAccount?.id ?? "none"}
        open={!!editAccount}
        account={editAccount ?? undefined}
        onClose={() => setEditAccount(null)}
        onSave={(data) => {
          if (editAccount) {
            updateAccount(editAccount.id, data);
            toast.success("Account updated", {
              description: `${data.name} (${data.code}) saved.`,
            });
          }
          setEditAccount(null);
        }}
      />

      <AlertDialog open={!!deleteAccountState} onOpenChange={(o) => !o && setDeleteAccountState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium text-foreground">{deleteAccountState?.name}</span>{" "}
              ({deleteAccountState?.code}) from the chart of accounts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-[5px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   Account drawer - shared by add + edit
   ============================================================ */

interface AccountDrawerProps {
  open: boolean;
  onClose: () => void;
  account?: Account;
  onSave: (data: Omit<Account, "id">) => void;
}

function AccountDrawer({ open, onClose, account, onSave }: AccountDrawerProps) {
  const accounts = useLedgerStore((s) => s.accounts);

  const [name, setName] = useState(account?.name ?? "");
  const [code, setCode] = useState(account?.code ?? "");
  const [group, setGroup] = useState<AccountGroup>(account?.group ?? "Asset");
  const [subgroup, setSubgroup] = useState<AccountSubgroup>(
    account?.subgroup ?? "Bank & Cash",
  );
  const [opening, setOpening] = useState<string>(String(account?.openingBalance ?? 0));
  const [nature, setNature] = useState<OpeningNature>(account?.openingNature ?? "Dr");

  // Sync subgroup when group changes - pick the first subgroup that
  // belongs to the new group (or Duties & Taxes maps to Asset by default).
  const allowedSubgroups = useMemo(
    () => SUBGROUPS.filter((s) => GROUP_FOR_SUBGROUP[s] === group),
    [group],
  );

  const onGroupChange = (g: AccountGroup) => {
    setGroup(g);
    const first = SUBGROUPS.find((s) => GROUP_FOR_SUBGROUP[s] === g);
    if (first) setSubgroup(first);
    setNature(defaultNatureForGroup(g));
  };

  // Auto-suggest a code when group changes and code is empty (add mode).
  const suggestCode = () => {
    if (account) return; // don't override in edit mode
    const suggested = suggestAccountCode(accounts, group);
    setCode(suggested);
  };

  const openingNum = Number(opening) || 0;

  const canSave = name.trim().length > 1 && code.trim().length >= 1 && openingNum >= 0;

  const handleSubmit = () => {
    if (!canSave) {
      toast.error("Cannot save account", {
        description: "Account name is required and opening balance must be zero or positive.",
      });
      return;
    }
    onSave({
      name: name.trim(),
      code: code.trim(),
      group,
      subgroup,
      openingBalance: openingNum,
      openingNature: nature,
      system: account?.system,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {account ? "Edit Account" : "New Account"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {account
                ? "Update account details · ledger entries keep their references."
                : "Add a new account to the chart · code auto-suggested by group."}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Identity */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <BookText className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Account Identity
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <FieldLabel required>Account name</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diesel Expense - Long Haul"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel required hint="5-digit code">
                    Account code
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="10000"
                      className="h-8 w-32 rounded-[5px] text-[13px] tabular"
                    />
                    {!account && (
                      <Btn variant="outline" size="sm" onClick={suggestCode} type="button">
                        Auto-suggest
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <BookText className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Classification
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Group</FieldLabel>
                  <Select value={group} onValueChange={(v) => onGroupChange(v as AccountGroup)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Subgroup</FieldLabel>
                  <Select
                    value={subgroup}
                    onValueChange={(v) => setSubgroup(v as AccountSubgroup)}
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedSubgroups.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Opening balance */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <BookText className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Opening Balance
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required hint="₹">Amount</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    placeholder="0"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Nature</FieldLabel>
                  <Select value={nature} onValueChange={(v) => setNature(v as OpeningNature)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr">Dr - Debit</SelectItem>
                      <SelectItem value="Cr">Cr - Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Effective opening</span>
                <span className="tabular text-[13px] font-medium text-foreground">
                  {formatINR(openingNum)} {nature}
                </span>
              </div>
            </div>

            {account?.system && (
              <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    This is a system-protected account. Edits are allowed, but it cannot be deleted.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="outline" size="sm" onClick={onClose} type="button">
            Cancel
          </Btn>
          <Btn variant="primary" size="sm" onClick={handleSubmit} icon={<Plus className="h-3.5 w-3.5" />} type="button">
            {account ? "Save changes" : "Create account"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
