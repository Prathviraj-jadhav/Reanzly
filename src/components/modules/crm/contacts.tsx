"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Star, Phone, Mail, Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrmStore } from "./_store";
import { CRM_CITIES, type Contact } from "./_data";
import { formatDate, relativeTime, initials, FieldLabel } from "./_helpers";

export function Contacts() {
  const contacts = useCrmStore((s) => s.contacts);
  const addContact = useCrmStore((s) => s.addContact);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const dmCount = contacts.filter((c) => c.decisionMaker).length;

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
            {initials(c.name)}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">{c.name}</span>
            <span className="text-[11px] text-muted-foreground">{c.title}</span>
          </div>
        </div>
      ),
    },
    {
      key: "accountName",
      header: "Account",
      sortable: true,
      sortValue: (c) => c.accountName,
      hideOnMobile: true,
      render: (c) => (
        <span className="text-[12px] text-foreground">{c.accountName}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      render: (c) => (
        <span className="text-[12px] tabular text-muted-foreground">{c.phone}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      hideOnMobile: true,
      render: (c) => (
        <span className="text-[11.5px] text-muted-foreground">{c.email}</span>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      sortValue: (c) => c.city,
      hideOnMobile: true,
      render: (c) => <span className="text-[12px] text-foreground">{c.city}</span>,
    },
    {
      key: "decisionMaker",
      header: "DM",
      sortable: true,
      sortValue: (c) => (c.decisionMaker ? 1 : 0),
      align: "center",
      render: (c) =>
        c.decisionMaker ? (
          <StatusBadge variant="solid">
            <Star className="mr-0.5 h-2.5 w-2.5" /> DM
          </StatusBadge>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "lastContacted",
      header: "Last Contacted",
      sortable: true,
      sortValue: (c) => c.lastContacted || "",
      render: (c) => (
        <span className="text-[11px] tabular text-muted-foreground">
          {c.lastContacted ? relativeTime(c.lastContacted) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiMini label="Total Contacts" value={String(contacts.length)} />
        <KpiMini label="Decision Makers" value={String(dmCount)} />
        <KpiMini
          label="Linked to Accounts"
          value={String(new Set(contacts.map((c) => c.accountId).filter(Boolean)).size)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Contacts · {contacts.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            People linked to accounts. Decision makers flagged.
          </p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
          New Contact
        </Btn>
      </div>

      <DataTable
        data={contacts}
        columns={columns}
        searchKeys={["contactId", "name", "title", "accountName", "email", "city"]}
        searchPlaceholder="Search contacts by name, account, email…"
        filters={[
          {
            label: "City",
            options: ["All", ...CRM_CITIES],
            accessor: (c) => c.city,
          },
          {
            label: "Decision Maker",
            options: ["All", "Yes", "No"],
            accessor: (c) => (c.decisionMaker ? "Yes" : "No"),
          },
        ]}
        onRowClick={(c) => setSelected(c)}
        rowActions={[
          {
            label: "View Details",
            onClick: (c) => setSelected(c),
          },
          {
            label: "Log Call",
            onClick: (c) => toast.success("Call logged", { description: `${c.name} · ${c.phone}` }),
          },
          {
            label: "Send Email",
            onClick: (c) => toast.success("Email sent", { description: `To ${c.email}` }),
          },
        ]}
        pageSize={15}
      />

      <ContactDetailDrawer
        contact={selected}
        onClose={() => setSelected(null)}
      />

      <NewContactDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onAdd={async (c) => {
          const created = await addContact(c);
          if (created) {
            setCreateOpen(false);
            toast.success("Contact added", { description: `${created.name} · ${created.contactId}` });
          } else {
            toast.error("Couldn't add contact", { description: "Try again." });
          }
        }}
        nextId={contacts.length + 1}
      />
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

function ContactDetailDrawer({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        {contact && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="outline" className="font-mono">
                  {contact.contactId}
                </StatusBadge>
                {contact.decisionMaker && (
                  <StatusBadge variant="solid">
                    <Star className="mr-0.5 h-2.5 w-2.5" /> Decision Maker
                  </StatusBadge>
                )}
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">
                {contact.name}
              </SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {contact.title} · {contact.accountName}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              <div className="grid grid-cols-1 gap-2">
                <Tile icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={contact.phone} mono />
                <Tile icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={contact.email} />
                <Tile icon={<Building2 className="h-3.5 w-3.5" />} label="Account" value={contact.accountName} />
                <Tile icon={<Building2 className="h-3.5 w-3.5" />} label="City" value={contact.city} />
                <Tile label="Last Contacted" value={contact.lastContacted ? formatDate(contact.lastContacted) : "-"} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Phone className="h-3.5 w-3.5" />}
                  onClick={() => toast.success("Call logged", { description: `${contact.name} · ${contact.phone}` })}
                >
                  Log Call
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  onClick={() => toast.success("Email sent", { description: `To ${contact.email}` })}
                >
                  Send Email
                </Btn>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Tile({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn("text-[12.5px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function NewContactDialog({
  open,
  onClose,
  onAdd,
  nextId,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Contact) => void;
  nextId: number;
}) {
  const accounts = useCrmStore((s) => s.accounts);
  const [form, setForm] = useState({
    name: "",
    title: "",
    accountName: "",
    phone: "",
    email: "",
    city: CRM_CITIES[0],
    decisionMaker: false,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!form.name.trim() || !form.title.trim()) {
      toast.error("Name and title are required");
      return;
    }
    const account = accounts.find((a) => a.name === form.accountName);
    const contact: Contact = {
      id: `ctc-${Date.now()}`,
      contactId: `CTC-${String(nextId).padStart(4, "0")}`,
      name: form.name.trim(),
      title: form.title.trim(),
      accountId: account?.id,
      accountName: form.accountName || "-",
      phone: form.phone || "-",
      email: form.email || "-",
      city: form.city,
      decisionMaker: form.decisionMaker,
      lastContacted: new Date().toISOString(),
    };
    onAdd(contact);
    setForm({ name: "", title: "", accountName: "", phone: "", email: "", city: CRM_CITIES[0], decisionMaker: false });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            New Contact
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Add a person. Link to an account for context.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel required>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. VP Logistics"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="col-span-2">
            <FieldLabel>Account</FieldLabel>
            <Select value={form.accountName} onValueChange={(v) => update("accountName", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@company.in"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Select value={form.city} onValueChange={(v) => update("city", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="toggle">Decision Maker</FieldLabel>
            <button
              type="button"
              onClick={() => update("decisionMaker", !form.decisionMaker)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
                form.decisionMaker
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {form.decisionMaker ? "Yes" : "No"}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit}>
            Add Contact
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
