"use client";

/* ============================================================
   IntegrationsMCPTab - Tab 2.
   Header with "Add MCP server" button + list of MCPConnection
   cards with expandable tool lists, health status, connect/
   disconnect, and remove (AlertDialog).
   ============================================================ */

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import type { MCPConnection, MCPTransport } from "./_data";
import { relativeTime, formatDateTime } from "./_helpers";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Server, Plus, Trash2, Power, ChevronDown, ChevronRight,
  Terminal, Globe, Radio, Wrench, Database, Loader2, Hash,
} from "lucide-react";
import {
  SectionHeader, EmptyPanel, TinyChip, mcpHealthVariant,
} from "./integrations-helpers";

interface Props {
  readOnly: boolean;
}

const TRANSPORTS: { id: MCPTransport; label: string; icon: typeof Terminal }[] = [
  { id: "stdio", label: "stdio", icon: Terminal },
  { id: "http",  label: "http",  icon: Globe },
  { id: "sse",   label: "sse",   icon: Radio },
];

function TransportIconBadge({ transport }: { transport: MCPTransport }) {
  const Icon = TRANSPORTS.find((x) => x.id === transport)?.icon ?? Terminal;
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function IntegrationsMCPTab({ readOnly }: Props) {
  const mcpConnections = useSuperadminStore((s) => s.mcpConnections);
  const connectMCP = useSuperadminStore((s) => s.connectMCP);
  const disconnectMCP = useSuperadminStore((s) => s.disconnectMCP);
  const removeMCPConnection = useSuperadminStore((s) => s.removeMCPConnection);
  const addMCPConnection = useSuperadminStore((s) => s.addMCPConnection);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MCPConnection | null>(null);

  function handleConnect(m: MCPConnection) {
    connectMCP(m.id);
    toast.success(`${m.name} connected`, { description: "Health check passed." });
  }
  function handleDisconnect(m: MCPConnection) {
    disconnectMCP(m.id);
    toast.success(`${m.name} disconnected`);
  }
  function handleRemove(m: MCPConnection) {
    removeMCPConnection(m.id);
    toast.success(`${m.name} removed`, { description: "Server entry deleted." });
    setRemoveTarget(null);
  }
  function handleAdd(input: Omit<MCPConnection, "id" | "createdAt" | "connected" | "tools" | "resourcesCount" | "healthStatus">) {
    const id = addMCPConnection(input);
    toast.success(`MCP server added`, { description: `${input.name} - id ${id}` });
    setAddOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={<Server className="h-3.5 w-3.5" />}
        title="MCP servers"
        subtitle={`${mcpConnections.length} registered`}
        action={
          !readOnly ? (
            <Btn
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAddOpen(true)}
            >
              Add MCP server
            </Btn>
          ) : undefined
        }
      />

      {mcpConnections.length === 0 ? (
        <EmptyPanel
          icon={<Server className="h-4 w-4" />}
          title="No MCP servers registered"
          description="Add a Model Context Protocol server to expose external tools to agents."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {mcpConnections.map((m) => (
            <MCPCard
              key={m.id}
              mcp={m}
              readOnly={readOnly}
              onConnect={() => handleConnect(m)}
              onDisconnect={() => handleDisconnect(m)}
              onRemove={() => setRemoveTarget(m)}
            />
          ))}
        </div>
      )}

      {/* Add MCP dialog */}
      <AddMCPDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={handleAdd} />

      {/* Remove confirm */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[14px]">
              <Trash2 className="h-4 w-4" />
              Remove {removeTarget?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This will permanently delete the MCP server entry
              <span className="font-medium text-foreground"> {removeTarget?.name}</span>.
              Audit entries are preserved. Tools will no longer be available to agents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => removeTarget && handleRemove(removeTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   MCPCard
   ============================================================ */
function MCPCard({
  mcp, readOnly, onConnect, onDisconnect, onRemove,
}: {
  mcp: MCPConnection;
  readOnly: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const health = mcpHealthVariant(mcp.healthStatus);

  return (
    <article className="rounded-[6px] border border-border bg-card">
      {/* Card header */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2.5">
          <TransportIconBadge transport={mcp.transport} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate text-[13px] font-medium text-foreground">{mcp.name}</h4>
              <StatusBadge variant="outline">{mcp.transport}</StatusBadge>
              {mcp.connected ? (
                <StatusBadge variant="solid" pulse>Connected</StatusBadge>
              ) : (
                <StatusBadge variant="muted">Disconnected</StatusBadge>
              )}
              <StatusBadge variant={health.variant} pulse={health.pulse}>
                {mcp.healthStatus}
              </StatusBadge>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground leading-snug">
              {mcp.description}
            </p>
          </div>
        </div>

        {/* Endpoint + args */}
        <div className="grid grid-cols-1 gap-2 text-[11.5px] sm:grid-cols-2">
          <div className="flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Endpoint</span>
            <code className="truncate font-mono text-[11px] text-foreground tabular">{mcp.endpoint}</code>
          </div>
          <div className="flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last check</span>
            <span className="text-foreground tabular">{relativeTime(mcp.lastCheckedAt)}</span>
          </div>
        </div>

        {mcp.transport === "stdio" && mcp.args && mcp.args.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Args</span>
            {mcp.args.map((a, i) => (
              <code
                key={i}
                className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground tabular"
              >
                {a}
              </code>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular">
            <Wrench className="h-3 w-3" />
            <span className="text-foreground">{mcp.tools.length}</span> tools
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <Database className="h-3 w-3" />
            <span className="text-foreground">{mcp.resourcesCount}</span> resources
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <Hash className="h-3 w-3" />
            created {formatDateTime(mcp.createdAt)}
          </span>
          <span className="truncate">by {mcp.createdBy}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-foreground hover:underline underline-offset-4"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            View tools ({mcp.tools.length})
          </button>

          <div className="flex items-center gap-1.5">
            {!readOnly && (
              mcp.connected ? (
                <Btn variant="outline" size="sm" icon={<Power className="h-3.5 w-3.5" />} onClick={onDisconnect}>
                  Disconnect
                </Btn>
              ) : (
                <Btn variant="primary" size="sm" icon={<Power className="h-3.5 w-3.5" />} onClick={onConnect}>
                  Connect
                </Btn>
              )
            )}
            {!readOnly && (
              <Btn variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onRemove}>
                Remove
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Expandable tools list */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          {mcp.tools.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              No tools discovered yet. Connect the server to discover tools.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mcp.tools.map((t) => (
                <li key={t.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    <code className="font-mono text-[12px] text-foreground">{t.name}</code>
                  </div>
                  <p className="ml-4 text-[11px] text-muted-foreground leading-snug">{t.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

/* ============================================================
   AddMCPDialog - form for new MCP server
   ============================================================ */
interface AddInput {
  name: string;
  description: string;
  transport: MCPTransport;
  endpoint: string;
  args?: string[];
  createdBy: string;
}

function AddMCPDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: AddInput) => void;
}) {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);

  return (
    <AddMCPDialogBody
      key={open ? "open" : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      createdBy={currentStaff?.email ?? "system"}
    />
  );
}

function AddMCPDialogBody({
  open, onOpenChange, onSubmit, createdBy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: AddInput) => void;
  createdBy: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transport, setTransport] = useState<MCPTransport>("stdio");
  const [endpoint, setEndpoint] = useState("");
  const [argsText, setArgsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim().length >= 3 && endpoint.trim().length > 0;

  function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const input: AddInput = {
        name: name.trim(),
        description: description.trim(),
        transport,
        endpoint: endpoint.trim(),
        args: transport === "stdio"
          ? argsText.split(",").map((a) => a.trim()).filter(Boolean)
          : undefined,
        createdBy,
      };
      onSubmit(input);
      // reset
      setName(""); setDescription(""); setTransport("stdio");
      setEndpoint(""); setArgsText("");
    }, 220);
  }

  function handleCancel() {
    onOpenChange(false);
    setTimeout(() => {
      setName(""); setDescription(""); setTransport("stdio");
      setEndpoint(""); setArgsText("");
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleCancel())}>
      <DialogContent className="w-full rounded-[6px] p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <Server className="h-4 w-4" />
            Add MCP server
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Register a Model Context Protocol server. Tools are discovered on connect.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[calc(90vh-160px)] flex-col gap-3 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[12px] font-medium text-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Filesystem (local)"
                className="mt-1 h-9 rounded-[5px] border-border bg-background text-[13px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Min 3 characters.</p>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-foreground">Transport</Label>
              <Select value={transport} onValueChange={(v) => setTransport(v as MCPTransport)}>
                <SelectTrigger className="mt-1 h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue placeholder="Pick transport" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px]">
                  {TRANSPORTS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.id} value={t.id} className="text-[13px]">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="font-mono">{t.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[12px] font-medium text-foreground">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this MCP server expose?"
              className="mt-1 min-h-[56px] resize-none rounded-[5px] border-border bg-background text-[12.5px]"
            />
          </div>

          <div>
            <Label className="text-[12px] font-medium text-foreground">
              {transport === "stdio" ? "Command" : "URL"}
            </Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={
                transport === "stdio"
                  ? "e.g. npx"
                  : transport === "http"
                    ? "https://mcp.example.com"
                    : "https://mcp.example.com/sse"
              }
              className="mt-1 h-9 rounded-[5px] border-border bg-background font-mono text-[12px]"
            />
          </div>

          {transport === "stdio" && (
            <div>
              <Label className="text-[12px] font-medium text-foreground">
                Args <span className="text-muted-foreground">(comma-separated)</span>
              </Label>
              <Input
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                placeholder="-y, @modelcontextprotocol/server-filesystem, /var/storage"
                className="mt-1 h-9 rounded-[5px] border-border bg-background font-mono text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Each comma-separated value becomes one argv entry.</p>
            </div>
          )}

          <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Created by <span className="font-medium text-foreground">{createdBy}</span>. New servers start
            disconnected - click <span className="font-medium text-foreground">Connect</span> after creation.
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Btn variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
            disabled={!valid || submitting}
          >
            {submitting ? "Adding..." : "Add server"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntegrationsMCPTab;
