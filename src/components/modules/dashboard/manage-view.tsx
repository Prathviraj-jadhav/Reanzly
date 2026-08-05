"use client";

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Share2, Copy, Trash2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useDashboardStore, type DashboardInstance,
} from "@/lib/store/dashboard-store";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/* ============================================================
   ManageView - table of all dashboards with rename / share /
   duplicate / delete actions.
   ============================================================ */

export function ManageView({ currentRoleId }: { currentRoleId: string }) {
  const { dashboards, renameDashboard, deleteDashboard, shareDashboard, duplicateDashboard, createDashboard, setActiveDashboard, setView } = useDashboardStore();
  const [renaming, setRenaming] = useState<DashboardInstance | null>(null);
  const [sharing, setSharing] = useState<DashboardInstance | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[13px] font-medium tracking-tight">All Dashboards</h3>
          <p className="text-[11px] text-muted-foreground">{dashboards.length} total · {dashboards.filter(d => d.owner === currentRoleId).length} owned by you</p>
        </div>
        <Btn variant="primary" size="sm" icon={<Plus className="h-3 w-3" />} onClick={() => setCreating(true)}>New Dashboard</Btn>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="grid grid-cols-12 gap-2 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Owner</div>
          <div className="col-span-2">Shared with</div>
          <div className="col-span-1 text-right">Widgets</div>
          <div className="col-span-2">Modified</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {dashboards.map((d) => {
            const owner = ROLE_ARCHETYPES.find((r) => r.id === d.owner);
            const sharedRoles = d.sharedWith
              .map((id) => ROLE_ARCHETYPES.find((r) => r.id === id))
              .filter(Boolean);
            const ownedByMe = d.owner === currentRoleId;
            return (
              <div key={d.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-[12px]">
                <div className="col-span-4 flex items-center gap-2">
                  <button
                    onClick={() => { setActiveDashboard(d.id); setView(ownedByMe ? "my" : "shared"); }}
                    className="truncate text-left font-medium hover:underline underline-offset-2"
                  >
                    {d.name}
                  </button>
                  {ownedByMe ? (
                    <StatusBadge variant="outline">You</StatusBadge>
                  ) : (
                    <StatusBadge variant="muted">Shared</StatusBadge>
                  )}
                </div>
                <div className="col-span-2 truncate text-muted-foreground">
                  {owner?.name ?? "Unknown"}
                  <div className="text-[10px] truncate">{owner?.branch}</div>
                </div>
                <div className="col-span-2 truncate text-muted-foreground">
                  {sharedRoles.length === 0 ? "-" : `${sharedRoles.length} role${sharedRoles.length === 1 ? "" : "s"}`}
                  {sharedRoles.length > 0 && (
                    <div className="truncate text-[10px]">{sharedRoles.map((r) => r?.name.split(" ")[0]).join(", ")}</div>
                  )}
                </div>
                <div className="col-span-1 text-right tabular font-medium">{d.layout.length}</div>
                <div className="col-span-2 text-muted-foreground tabular text-[11px]">
                  {formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true })}
                </div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground tap">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => setRenaming(d)} disabled={!ownedByMe}>
                        <Pencil className="mr-2 h-3 w-3" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setSharing(d)} disabled={!ownedByMe}>
                        <Share2 className="mr-2 h-3 w-3" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => duplicateDashboard(d.id, currentRoleId)}>
                        <Copy className="mr-2 h-3 w-3" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => { if (ownedByMe) deleteDashboard(d.id); }}
                        disabled={!ownedByMe}
                        className="text-foreground focus:text-foreground"
                      >
                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
          {dashboards.length === 0 && (
            <div className="px-3 py-12 text-center text-[12px] text-muted-foreground">
              No dashboards yet. Click &ldquo;New Dashboard&rdquo; to create one.
            </div>
          )}
        </div>
      </div>

      {/* Rename dialog */}
      {renaming && (
        <RenameDialog
          dashboard={renaming}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => { renameDashboard(renaming.id, name); setRenaming(null); }}
        />
      )}
      {/* Share dialog */}
      {sharing && (
        <ShareDialog
          dashboard={sharing}
          currentRoleId={currentRoleId}
          onClose={() => setSharing(null)}
          onSubmit={(roleIds) => { shareDashboard(sharing.id, roleIds); setSharing(null); }}
        />
      )}
      {/* Create dialog */}
      {creating && (
        <RenameDialog
          dashboard={null}
          onClose={() => setCreating(false)}
          onSubmit={(name) => { createDashboard(name, currentRoleId); setCreating(false); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Rename / Create dialog
   ============================================================ */

function RenameDialog({
  dashboard, onClose, onSubmit,
}: {
  dashboard: DashboardInstance | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(dashboard?.name ?? "");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-medium tracking-tight">
            {dashboard ? "Rename Dashboard" : "New Dashboard"}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {dashboard ? "Give this dashboard a clearer name." : "Give your new dashboard a name to get started."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}
          className="flex flex-col gap-3"
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Ops Review"
            className="h-9 text-[13px]"
          />
          <DialogFooter>
            <Btn type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
            <Btn type="submit" variant="primary" size="sm" disabled={!name.trim()}>
              {dashboard ? "Save" : "Create"}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Share dialog - multi-select roles via checkboxes.
   ============================================================ */

function ShareDialog({
  dashboard, currentRoleId, onClose, onSubmit,
}: {
  dashboard: DashboardInstance;
  currentRoleId: string;
  onClose: () => void;
  onSubmit: (roleIds: string[]) => void;
}) {
  const initial = useMemo(() => new Set(dashboard.sharedWith), [dashboard]);
  const [selected, setSelected] = useState<Set<string>>(initial);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-medium tracking-tight">Share &ldquo;{dashboard.name}&rdquo;</DialogTitle>
          <DialogDescription className="text-[12px]">
            Selected roles will see this dashboard in their &ldquo;Shared with me&rdquo; view (read-only).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {ROLE_ARCHETYPES
            .filter((r) => r.id !== currentRoleId && r.id !== dashboard.owner)
            .map((r) => {
              const checked = selected.has(r.id);
              return (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[5px] border px-3 py-2 transition-colors tap",
                    checked ? "border-foreground/30 bg-accent/40" : "border-border hover:bg-accent/30",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(r.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{r.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{r.description.split("-")[0].trim()}</div>
                  </div>
                  <span className="text-[10px] tabular text-muted-foreground">{r.branch}</span>
                </label>
              );
            })}
        </div>
        <DialogFooter>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" onClick={() => onSubmit(Array.from(selected))}>
            Share with {selected.size} role{selected.size === 1 ? "" : "s"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   DashboardSelector - compact dropdown of dashboards for the
   current view. Used in the top bar.
   ============================================================ */

export function DashboardSelector({
  dashboards, activeId, onSelect,
}: {
  dashboards: DashboardInstance[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const active = dashboards.find((d) => d.id === activeId);
  return (
    <Select value={activeId} onValueChange={onSelect}>
      <SelectTrigger size="sm" className="h-8 min-w-[180px] text-[12px] font-medium">
        <SelectValue placeholder="Select dashboard">
          {active?.name ?? "No dashboards"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {dashboards.length === 0 ? (
          <SelectItem value="_none" disabled>No dashboards available</SelectItem>
        ) : (
          dashboards.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              <span className="truncate">{d.name}</span>
              <span className="ml-2 text-[10px] tabular text-muted-foreground">{d.layout.length}w</span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
