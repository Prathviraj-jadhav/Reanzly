"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { Banknote } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import { cn } from "@/lib/utils";
import { Overview } from "./overview";
import { Employees } from "./employees";
import { Attendance } from "./attendance";
import { Leave } from "./leave";
import { Recruitment } from "./recruitment";
import { Documents } from "./documents";
import { Performance } from "./performance";
import { Onboarding } from "./onboarding";
import { Exit } from "./exit";
import { Issuances } from "./issuances";
import { HR_TABS, type HrTab } from "./_helpers";
import type { IssuanceType, Employee } from "./_data";
import { useHrStore } from "./_store";

export function HRModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const resolvedTab = (view.tab as HrTab | undefined) ?? "overview";
  const [tab, setTab] = useState<HrTab>(resolvedTab);
  const hrLoaded = useHrStore((s) => s.loaded);
  const hydrate = useHrStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setTab(resolvedTab);
  }, [resolvedTab]);

  const onTabChange = useCallback(
    (next: HrTab) => {
      setTab(next);
      goToModule("hr", "list", undefined, next === "overview" ? undefined : next);
    },
    [goToModule],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetTemplate, setPresetTemplate] = useState<IssuanceType | null>(null);
  const [presetEmployee, setPresetEmployee] = useState<Employee | null>(null);
  const [drawerKey, setDrawerKey] = useState("closed");

  const openIssuanceDrawer = useCallback(
    (template?: IssuanceType, employee?: Employee) => {
      setPresetTemplate(template || null);
      setPresetEmployee(employee || null);
      setDrawerKey(`open-${Date.now()}`);
      setDrawerOpen(true);
      onTabChange("issuances");
    },
    [onTabChange],
  );

  const closeIssuanceDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerKey("closed");
  }, []);

  if (!hrLoaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading HR…</div>;
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="HR"
        description="Employees, attendance, leave, payroll, recruitment, performance, onboarding, and exit."
        meta={[
          { label: "Module", value: "HR" },
          { label: "Statutory", value: "PF · ESI · PT · TDS" },
        ]}
        actions={
          <Btn
            variant="outline"
            size="sm"
            icon={<Banknote className="h-3.5 w-3.5" />}
            onClick={() => goToModule("payroll")}
          >
            Open Payroll
          </Btn>
        }
      />

      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {HR_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
              tab === t.id
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-8">
        {tab === "overview" && <Overview />}
        {tab === "employees" && <Employees />}
        {tab === "attendance" && <Attendance />}
        {tab === "leave" && <Leave />}
        {tab === "recruitment" && (
          <Recruitment
            onGenerateOffer={() => openIssuanceDrawer("offer-letter")}
          />
        )}
        {tab === "documents" && <Documents />}
        {tab === "issuances" && (
          <Issuances
            drawerOpen={drawerOpen}
            presetTemplate={presetTemplate}
            presetEmployee={presetEmployee}
            drawerKey={drawerKey}
            onOpenDrawer={openIssuanceDrawer}
            onCloseDrawer={closeIssuanceDrawer}
          />
        )}
        {tab === "performance" && <Performance />}
        {tab === "onboarding" && (
          <Onboarding
            onIssueAppointment={(emp) => openIssuanceDrawer("appointment-letter", emp)}
          />
        )}
        {tab === "exit" && (
          <Exit
            onIssueRelieving={(emp) => openIssuanceDrawer("relieving-letter", emp)}
            onIssueExperience={(emp) => openIssuanceDrawer("experience-letter", emp)}
          />
        )}
      </div>
    </div>
  );
}
