"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  User,
  Briefcase,
  KeyRound,
  Banknote,
  IdCard,
  Sparkles,
  Mail,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ADD_EMPLOYEE_STEPS,
  EMPLOYEE_ROLES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  SYSTEM_ROLES,
  BRANCHES,
  MODULES,
  LICENSE_CLASSES,
  INDIAN_STATES,
  EMPTY_EMPLOYEE_FORM,
  type EmployeeForm,
  FieldLabel,
} from "./_helpers";
import type { Driver } from "@/lib/types";

interface AddEmployeeDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Create callback - persists the new driver/staff to the parent list. */
  onAdd?: (driver: Driver) => void;
}

const STEP_DESCRIPTIONS: Record<number, { tagline: string; tier: string }> = {
  1: { tier: "Personal", tagline: "Identity and contact details" },
  2: { tier: "Role", tagline: "Classification and reporting structure" },
  3: { tier: "Access", tagline: "System role and module permissions" },
  4: { tier: "Employment", tagline: "Compensation, joining, and banking" },
  5: { tier: "License", tagline: "Compliance documents - required for drivers" },
  6: { tier: "Review", tagline: "Confirm and generate credentials" },
};

export function AddEmployeeDrawer({ open, onClose, onAdd }: AddEmployeeDrawerProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_EMPLOYEE_FORM);
  // Generated credentials after submit (used on success toast)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const update = <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // ===== Per-step validation =====
  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    // Step 1
    const s1: string[] = [];
    if (!form.fullName.trim()) s1.push("Full name is required");
    if (!form.phone.trim()) s1.push("Phone is required");
    if (!form.email.trim()) s1.push("Email is required");
    if (s1.length) errors[1] = s1;
    // Step 2 - role & department auto-filled but require job title
    // No required additional fields (role/department have defaults)
    // Step 4
    const s4: string[] = [];
    if (!form.joiningDate) s4.push("Joining date is required");
    if (!form.salary.trim() && !form.hourlyRate.trim()) s4.push("Either salary or hourly rate is required");
    if (s4.length) errors[4] = s4;
    // Step 5 - license only required for drivers
    if (form.isDriver) {
      const s5: string[] = [];
      if (!form.licenseNumber.trim()) s5.push("License number is required for drivers");
      if (!form.licenseExpiryDate) s5.push("License expiry date is required");
      if (s5.length) errors[5] = s5;
    }
    return errors;
  }, [form]);

  const currentErrors = stepErrors[step] || [];
  const isLastStep = step === 6;
  const canAdvance = currentErrors.length === 0;

  // Auto-sync isDriver when role changes
  const setRole = (role: string) => {
    setForm((s) => ({ ...s, role, isDriver: role === "Driver" }));
  };

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: currentErrors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < 6) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const goTo = (s: number) => {
    if (s <= step) {
      setStep(s);
      return;
    }
    for (let i = step; i < s; i++) {
      if (stepErrors[i]?.length) {
        toast("Complete step " + i + " first", { description: stepErrors[i][0] });
        setStep(i);
        return;
      }
    }
    setStep(s);
  };

  const generateTempPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "RZ-";
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const handleSubmit = () => {
    const issues = Object.values(stepErrors).flat();
    if (issues.length) {
      toast("Compliance check failed", {
        description: `${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve`,
      });
      setStep(1);
      return;
    }
    const email = form.email || `${form.fullName.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`;
    const password = generateTempPassword();
    setCredentials({ email, password });
    if (onAdd) {
      const newDriver: Driver = {
        id: `drv-${Date.now()}`,
        name: form.fullName,
        role: form.isDriver ? "Driver" : "Staff",
        department: form.department,
        status: "Active",
        contact: form.phone,
        assignedVehicle: undefined,
        licenseNumber: form.licenseNumber || "-",
        licenseExpiry: form.licenseExpiryDate || new Date(Date.now() + 365 * 86400000).toISOString(),
        lastActive: new Date().toISOString(),
        email,
        rating: 0,
        tripsCompleted: 0,
        onTimeRate: 0,
        city: form.address ? form.address.split(",")[0].trim() : "-",
      };
      onAdd(newDriver);
    }
    toast.success("Employee added", {
      description: `${form.fullName} · credentials generated`,
    });
    setStep(1);
    setForm(EMPTY_EMPLOYEE_FORM);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Add Employee
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Six steps · credentials auto-generated · auto-saved as draft
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {ADD_EMPLOYEE_STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const errored = stepErrors[s.id]?.length && step <= s.id;
              // Hide step 5 (License) for non-drivers - but still show in stepper for consistency
              const hidden = s.id === 5 && !form.isDriver;
              if (hidden) return null;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => goTo(s.id)}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors",
                        active && "border-foreground bg-foreground text-background",
                        done && "border-foreground bg-foreground text-background",
                        !active && !done && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[12px] font-medium md:inline",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    {errored && <AlertCircle className="h-3 w-3 text-foreground" />}
                  </button>
                  {i < ADD_EMPLOYEE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-4",
                        step > s.id ? "bg-foreground" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Step {step}
            </span>
            <span className="text-[13px] font-medium text-foreground">
              {STEP_DESCRIPTIONS[step].tier}
            </span>
            <span className="text-[12px] text-muted-foreground">
              · {STEP_DESCRIPTIONS[step].tagline}
            </span>
          </div>

          {step === 1 && <Step1Personal form={form} update={update} />}
          {step === 2 && <Step2Role form={form} update={update} setRole={setRole} />}
          {step === 3 && <Step3Access form={form} update={update} />}
          {step === 4 && <Step4Employment form={form} update={update} />}
          {step === 5 && form.isDriver && <Step5License form={form} update={update} />}
          {step === 5 && !form.isDriver && (
            <div className="rounded-[6px] border border-border bg-card p-6 text-center">
              <IdCard className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-[13px] font-medium text-foreground">No license required</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Staff roles do not require a driving license. Proceed to the next step.
              </p>
            </div>
          )}
          {step === 6 && <Step6Review form={form} />}
        </div>

        {/* Validation strip */}
        {currentErrors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{currentErrors[0]}</span>
              {currentErrors.length > 1 && (
                <span className="text-muted-foreground">
                  · {currentErrors.length - 1} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn
            variant="ghost"
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            onClick={goBack}
            disabled={step === 1}
          >
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 6</div>
          {isLastStep ? (
            <Btn
              variant="primary"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
            >
              Generate Credentials
            </Btn>
          ) : (
            <Btn variant="primary" onClick={goNext} disabled={!canAdvance}>
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Step 1: Personal =====
function Step1Personal({
  form,
  update,
}: {
  form: EmployeeForm;
  update: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Identity
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel required>Full Name</FieldLabel>
            <Input
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="First and last name"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Date of Birth</FieldLabel>
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel>Gender</FieldLabel>
            <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Male", "Female", "Other"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Contact
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Phone</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Alt Phone</FieldLabel>
            <Input
              value={form.altPhone}
              onChange={(e) => update("altPhone", e.target.value)}
              placeholder="+91 98765 43210"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel required>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="firstname.lastname@reanzly.in"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Alt Email</FieldLabel>
            <Input
              type="email"
              value={form.altEmail}
              onChange={(e) => update("altEmail", e.target.value)}
              placeholder="personal@email.com"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Address & Emergency
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Residential Address</FieldLabel>
            <Textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="House / Street / City / PIN"
              className="min-h-[64px] rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Emergency Contact</FieldLabel>
            <Input
              value={form.emergencyContact}
              onChange={(e) => update("emergencyContact", e.target.value)}
              placeholder="Name · relationship · phone"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 2: Role & Classification =====
function Step2Role({
  form,
  update,
  setRole,
}: {
  form: EmployeeForm;
  update: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
  setRole: (role: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Role & Department
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Role</FieldLabel>
            <Select value={form.role} onValueChange={setRole}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.isDriver && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Driver role - license & compliance step will be required
              </p>
            )}
          </div>
          <div>
            <FieldLabel required>Department</FieldLabel>
            <Select value={form.department} onValueChange={(v) => update("department", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="optional">Job Title</FieldLabel>
            <Input
              value={form.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              placeholder={form.isDriver ? "Heavy Vehicle Driver" : "Operations Lead"}
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Group</FieldLabel>
            <Select value={form.group} onValueChange={(v) => update("group", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Line Haul", "City Delivery", "Long Haul", "Specialized", "Attached Fleet"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel hint="optional">Reporting Manager</FieldLabel>
            <Select value={form.reportingManager} onValueChange={(v) => update("reportingManager", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {["Vikram Deshmukh", "Rohit Sharma", "Sukhbir Gill", "Reena Mehta", "Anil Reddy"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 3: Access Control =====
function Step3Access({
  form,
  update,
}: {
  form: EmployeeForm;
  update: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
}) {
  const toggleModule = (m: string) => {
    const next = form.modulePermissions.includes(m)
      ? form.modulePermissions.filter((x) => x !== m)
      : [...form.modulePermissions, m];
    update("modulePermissions", next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            System Access
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>System Role</FieldLabel>
            <Select value={form.systemRole} onValueChange={(v) => update("systemRole", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Determines default permissions and dashboard layout
            </p>
          </div>
          <div>
            <FieldLabel required>Branch</FieldLabel>
            <Select value={form.branch} onValueChange={(v) => update("branch", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Module Permissions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => update("modulePermissions", [...MODULES])}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Select all
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={() => update("modulePermissions", [])}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {MODULES.map((m) => {
            const checked = form.modulePermissions.includes(m);
            return (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[5px] border px-2.5 py-1.5 text-[12px] transition-colors",
                  checked ? "border-foreground/60 bg-accent/40 text-foreground" : "border-border text-muted-foreground hover:bg-accent/30",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleModule(m)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{m}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {form.modulePermissions.length} of {MODULES.length} modules selected
        </p>
      </div>
    </div>
  );
}

// ===== Step 4: Employment =====
function Step4Employment({
  form,
  update,
}: {
  form: EmployeeForm;
  update: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Employment
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>Joining Date</FieldLabel>
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => update("joiningDate", e.target.value)}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel required>Employment Type</FieldLabel>
            <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Compensation
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="INR/month">Monthly Salary</FieldLabel>
            <Input
              type="number"
              value={form.salary}
              onChange={(e) => update("salary", e.target.value)}
              placeholder={form.isDriver ? "22000" : "35000"}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="INR/hr">Hourly Rate</FieldLabel>
            <Input
              type="number"
              value={form.hourlyRate}
              onChange={(e) => update("hourlyRate", e.target.value)}
              placeholder="180"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Bank & Statutory
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Bank Name</FieldLabel>
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              placeholder="HDFC Bank"
              className="h-8 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Account Number</FieldLabel>
            <Input
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value)}
              placeholder="0000 0000 0000"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">IFSC</FieldLabel>
            <Input
              value={form.ifsc}
              onChange={(e) => update("ifsc", e.target.value.toUpperCase())}
              placeholder="HDFC0000123"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">PAN</FieldLabel>
            <Input
              value={form.pan}
              onChange={(e) => update("pan", e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Aadhaar</FieldLabel>
            <Input
              value={form.aadhaar}
              onChange={(e) => update("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="0000 0000 0000"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 5: License & Compliance =====
function Step5License({
  form,
  update,
}: {
  form: EmployeeForm;
  update: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <IdCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Driving License
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel required>License Number</FieldLabel>
            <Input
              value={form.licenseNumber}
              onChange={(e) => update("licenseNumber", e.target.value.toUpperCase())}
              placeholder="MH0420240001234"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel required>License Class</FieldLabel>
            <Select value={form.licenseClass} onValueChange={(v) => update("licenseClass", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Issuing State</FieldLabel>
            <Select value={form.issuingState} onValueChange={(v) => update("issuingState", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="optional">Issue Date</FieldLabel>
            <Input
              type="date"
              value={form.licenseIssueDate}
              onChange={(e) => update("licenseIssueDate", e.target.value)}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel required>Expiry Date</FieldLabel>
            <Input
              type="date"
              value={form.licenseExpiryDate}
              onChange={(e) => update("licenseExpiryDate", e.target.value)}
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Additional Compliance
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel hint="optional">Medical Certificate #</FieldLabel>
            <Input
              value={form.medicalCert}
              onChange={(e) => update("medicalCert", e.target.value)}
              placeholder="MED-2024-001234"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
          <div>
            <FieldLabel hint="optional">Badge Number</FieldLabel>
            <Input
              value={form.badge}
              onChange={(e) => update("badge", e.target.value)}
              placeholder="BDG-001234"
              className="h-8 rounded-[5px] text-[13px] tabular"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Step 6: Review =====
function Step6Review({ form }: { form: EmployeeForm }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Credential Generation
            </span>
          </div>
          <StatusBadge variant="outline">On submit</StatusBadge>
        </div>
        <p className="text-[13px] text-foreground">
          On submit, an account will be created with:
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            Email: <span className="tabular text-foreground">{form.email || `${form.fullName.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`}</span>
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-3 w-3" />
            Auto-generated temporary password (sent via email + SMS)
          </li>
          <li className="flex items-center gap-2">
            <KeyRound className="h-3 w-3" />
            System role: <span className="text-foreground">{form.systemRole}</span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            {form.modulePermissions.length} module permissions assigned
          </li>
          {form.isDriver && (
            <li className="flex items-center gap-2">
              <IdCard className="h-3 w-3" />
              Driver compliance records created (license + medical)
            </li>
          )}
        </ul>
      </div>

      <ReviewSection title="Personal" icon={User}>
        <ReviewRow label="Full Name" value={form.fullName || "-"} />
        <ReviewRow label="DOB" value={form.dob || "-"} />
        <ReviewRow label="Gender" value={form.gender} />
        <ReviewRow label="Phone" value={form.phone || "-"} mono />
        <ReviewRow label="Alt Phone" value={form.altPhone || "-"} mono />
        <ReviewRow label="Email" value={form.email || "-"} />
        <ReviewRow label="Alt Email" value={form.altEmail || "-"} />
        <ReviewRow label="Address" value={form.address || "-"} />
        <ReviewRow label="Emergency Contact" value={form.emergencyContact || "-"} />
      </ReviewSection>

      <ReviewSection title="Role & Classification" icon={Briefcase}>
        <ReviewRow label="Role" value={form.role} />
        <ReviewRow label="Department" value={form.department} />
        <ReviewRow label="Job Title" value={form.jobTitle || "-"} />
        <ReviewRow label="Reporting Manager" value={form.reportingManager || "-"} />
        <ReviewRow label="Group" value={form.group} />
      </ReviewSection>

      <ReviewSection title="Access Control" icon={KeyRound}>
        <ReviewRow label="System Role" value={form.systemRole} />
        <ReviewRow label="Branch" value={form.branch} />
        <ReviewRow label="Modules" value={`${form.modulePermissions.length} modules`} />
      </ReviewSection>

      <ReviewSection title="Employment" icon={Banknote}>
        <ReviewRow label="Joining Date" value={form.joiningDate || "-"} />
        <ReviewRow label="Employment Type" value={form.employmentType} />
        <ReviewRow label="Monthly Salary" value={form.salary ? `₹${Number(form.salary).toLocaleString("en-IN")}` : "-"} mono />
        <ReviewRow label="Hourly Rate" value={form.hourlyRate ? `₹${form.hourlyRate}/hr` : "-"} mono />
        <ReviewRow label="Bank" value={form.bankName || "-"} />
        <ReviewRow label="Account #" value={form.bankAccount || "-"} mono />
        <ReviewRow label="IFSC" value={form.ifsc || "-"} mono />
        <ReviewRow label="PAN" value={form.pan || "-"} mono />
        <ReviewRow label="Aadhaar" value={form.aadhaar ? `XXXX XXXX ${form.aadhaar.slice(-4)}` : "-"} mono />
      </ReviewSection>

      {form.isDriver && (
        <ReviewSection title="License & Compliance" icon={IdCard}>
          <ReviewRow label="License Number" value={form.licenseNumber || "-"} mono />
          <ReviewRow label="License Class" value={form.licenseClass} />
          <ReviewRow label="Issuing State" value={form.issuingState} />
          <ReviewRow label="Issue Date" value={form.licenseIssueDate || "-"} />
          <ReviewRow label="Expiry Date" value={form.licenseExpiryDate || "-"} />
          <ReviewRow label="Medical Cert" value={form.medicalCert || "-"} mono />
          <ReviewRow label="Badge #" value={form.badge || "-"} mono />
        </ReviewSection>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-x-6 px-4 py-2 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] text-foreground text-right", mono && "tabular")}>
        {value}
      </span>
    </div>
  );
}
