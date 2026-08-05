"use client";

import { useState, useMemo } from "react";
import { DetailLayout } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { useAppStore } from "@/lib/store/app-store";
import { VEHICLES } from "@/lib/mock-data";
import type { Driver } from "@/lib/types";
import {
  User, Truck, Car, Send, Pencil, Star,
  KeyRound, UserX, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { initials } from "./_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { DriverOverviewTab } from "./tabs/overview";
import { DriverVehicleAssignmentTab } from "./tabs/vehicle-assignment";
import { DriverPerformanceTab } from "./tabs/performance";
import { DriverDocumentsTab } from "./tabs/documents";
import { DriverExpensesTab } from "./tabs/expenses";
import { DriverInspectionComplianceTab } from "./tabs/inspection-compliance";
import { DriverIssuesTab } from "./tabs/issues";
import { DriverPayrollTab } from "./tabs/payroll";
import { DriverAttendanceTab } from "./tabs/attendance";
import { EditEmployeeDrawer } from "./edit-employee-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "assignment", label: "Vehicle Assignment" },
  { id: "performance", label: "Performance" },
  { id: "documents", label: "Documents" },
  { id: "expenses", label: "Expenses" },
  { id: "inspection", label: "Inspection & Compliance" },
  { id: "issues", label: "Issues" },
  { id: "payroll", label: "Payroll" },
  { id: "attendance", label: "Attendance" },
];

interface DriverDetailProps {
  driverId: string;
  drivers: Driver[];
  onUpdate: (id: string, data: Partial<Driver>) => void;
}

export function DriverDetail({ driverId, drivers, onUpdate }: DriverDetailProps) {
  const { navigate, navigateDetail, setActiveConversation, setChatOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const driver = useMemo(() => drivers.find((d) => d.id === driverId), [drivers, driverId]);

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Employee <span className="tabular">{driverId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("drivers-staff")}>
          Back to Drivers & Staff
        </Btn>
      </div>
    );
  }

  const handleSendMessage = () => {
    // Use the operations channel as the driver's active conversation (mock).
    setActiveConversation("c1");
    setChatOpen(true);
    toast(`Chat opened with ${driver.name}`, { description: "Operations channel selected" });
  };

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
        Edit
      </Btn>
      <Btn
        icon={<Car className="h-3.5 w-3.5" />}
        onClick={() => setActiveTab("assignment")}
      >
        Assign Vehicle
      </Btn>
      <Btn
        variant="primary"
        icon={<Send className="h-3.5 w-3.5" />}
        onClick={handleSendMessage}
      >
        Send Message
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Reset Password", onClick: () => setResetOpen(true) },
    { label: "Generate ID Card", onClick: () => toast("ID card generated") },
    { label: "Issue Advance", onClick: () => toast("Advance entry opened") },
    { label: "Download KYC", onClick: () => toast("KYC pack exported") },
    { label: "Deactivate", onClick: () => setDeactivateOpen(true) },
  ];

  return (
    <DetailLayout
      title={driver.name}
      subtitle={driver.email}
      badges={
        <>
          <StatusBadge variant={driver.role === "Driver" ? "outline" : "muted"}>
            {driver.role === "Driver" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {driver.role}
          </StatusBadge>
          <StatusBadge variant={driver.status === "Active" ? "outline" : "muted"} pulse={driver.status === "Active"}>
            {driver.status}
          </StatusBadge>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {driver.department}
          </span>
          {driver.assignedVehicle && (
            <button
              onClick={() => {
                const v = VEHICLES.find((ve) => ve.name === driver.assignedVehicle);
                if (v) navigateDetail("vehicles", v.id);
              }}
              className="inline-flex items-center gap-1 text-foreground hover:underline tabular"
            >
              <Car className="h-3 w-3" />
              {driver.assignedVehicle}
            </button>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span className="tabular">{driver.rating.toFixed(1)}</span>
          </span>
          <span className="tabular">{driver.contact}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* Avatar + summary header */}
      <div className="mb-5 flex items-center gap-4 rounded-[6px] border border-border bg-card p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[18px] font-medium tabular text-foreground">
          {initials(driver.name)}
        </span>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trips</span>
            <span className="tabular text-[18px] font-medium">{driver.tripsCompleted}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">On-Time Rate</span>
            <span className="tabular text-[18px] font-medium">{Math.round(driver.onTimeRate * 100)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rating</span>
            <span className="tabular text-[18px] font-medium">{driver.rating.toFixed(1)} / 5.0</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Active</span>
            <span className="text-[14px]">{relativeTimeShort(driver.lastActive)}</span>
          </div>
          {driver.role === "Driver" && (
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">License</span>
              <span className="tabular text-[14px]">{driver.licenseNumber || "-"}</span>
            </div>
          )}
        </div>
      </div>

      {activeTab === "overview" && <DriverOverviewTab driver={driver} />}
      {activeTab === "assignment" && <DriverVehicleAssignmentTab driver={driver} />}
      {activeTab === "performance" && <DriverPerformanceTab driver={driver} />}
      {activeTab === "documents" && <DriverDocumentsTab driver={driver} />}
      {activeTab === "expenses" && <DriverExpensesTab driver={driver} />}
      {activeTab === "inspection" && <DriverInspectionComplianceTab driver={driver} />}
      {activeTab === "issues" && <DriverIssuesTab driver={driver} />}
      {activeTab === "payroll" && <DriverPayrollTab driver={driver} />}
      {activeTab === "attendance" && <DriverAttendanceTab driver={driver} />}

      <EditEmployeeDrawer
        open={editOpen}
        driver={driver}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />
      <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} driver={driver} />
      <DeactivateDialog open={deactivateOpen} onOpenChange={setDeactivateOpen} driver={driver} />
    </DetailLayout>
  );
}

function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driver: Driver;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[420px] rounded-[6px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[16px] font-medium">Reset Password?</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] text-muted-foreground">
            A password reset link will be emailed to <span className="text-foreground tabular">{driver.email}</span>. The link expires in 60 minutes. The driver will be signed out of all active sessions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-foreground bg-foreground px-3 text-[13px] font-medium text-background hover:bg-foreground/90"
            onClick={() => {
              toast.success("Reset link sent", { description: driver.email });
              onOpenChange(false);
            }}
          >
            <KeyRound className="h-3.5 w-3.5" /> Send Reset Link
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeactivateDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driver: Driver;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
            <UserX className="h-4 w-4" /> Deactivate Driver
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Deactivating <span className="text-foreground">{driver.name}</span> will revoke system access and unassign from active trips. This action can be reversed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Reason for Deactivation</label>
            <SavageTextarea
              category="remarks"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="rounded-[5px] border border-border bg-background p-3 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Affected items
            </div>
            <ul className="mt-1.5 ml-5 list-disc space-y-0.5">
              <li>Active vehicle assignment will be released</li>
              <li>Open trips will be flagged for re-assignment</li>
              <li>Payroll processing paused until reactivation</li>
              <li>System login revoked immediately</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn
            variant="primary"
            icon={<UserX className="h-3.5 w-3.5" />}
            onClick={() => {
              if (!reason.trim()) {
                toast.error("A reason is required for deactivation");
                return;
              }
              toast.success(`${driver.name} deactivated`, { description: reason });
              onOpenChange(false);
              setReason("");
            }}
          >
            Deactivate
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
