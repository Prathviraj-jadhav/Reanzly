"use client";
import { useEffect } from "react";
import {
  User, Bell, Lock, Palette, ShieldCheck, Building2, Database, Layers,
  Grid3x3, Plug,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type SettingsTab } from "@/lib/store/app-store";
import { SETTINGS_SECTIONS } from "./_helpers";
import { ProfileSection } from "./sections/profile";
import { NotificationsSection } from "./sections/notifications";
import { LoginSecuritySection } from "./sections/login-security";
import { AppearanceSection } from "./sections/appearance";
import { AccessSecuritySection } from "./sections/access-security";
import { OrganizationSection } from "./sections/organization";
import { DataManagementSection } from "./sections/data-management";
import { CompaniesSection } from "./sections/companies";
import { AccessMatrixModule } from "../access-matrix";
import { IntegrationsModule } from "../integrations";

const ICONS: Record<string, LucideIcon> = {
  User, Bell, Lock, Palette, ShieldCheck, Building2, Database, Layers,
  Grid3x3, Plug,
};

export function SettingsModule() {
  const { activeView, setSettingsTab } = useAppStore();
  const activeTab: SettingsTab = activeView.settingsTab || "profile";

  // Ensure a default tab when navigating to settings without one
  useEffect(() => {
    if (!activeView.settingsTab && activeView.module === "settings") {
      setSettingsTab("profile");
    }
  }, [activeView.settingsTab, activeView.module, setSettingsTab]);

  return (
    <div className="flex gap-6">
      {/* Sub-sidebar */}
      <aside className="hidden md:flex md:w-[200px] md:shrink-0 md:flex-col md:sticky md:top-0 md:self-start">
        <div className="border-b border-border pb-3 mb-2">
          <h1 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Settings</h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Configure your workspace</p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = ICONS[section.icon] || User;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setSettingsTab(section.id)}
                className={cn(
                  "group flex items-start gap-2.5 rounded-[5px] px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[13px] font-medium leading-tight", isActive ? "text-foreground" : "text-foreground")}>
                    {section.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{section.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile section selector */}
      <div className="md:hidden -mx-2 mb-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setSettingsTab(section.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground"
                )}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 max-w-[1200px]">
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "notifications" && <NotificationsSection />}
        {activeTab === "login" && <LoginSecuritySection />}
        {activeTab === "appearance" && <AppearanceSection />}
        {activeTab === "access-security" && <AccessSecuritySection />}
        {activeTab === "access-matrix" && <AccessMatrixModule />}
        {activeTab === "organization" && <OrganizationSection />}
        {activeTab === "data-management" && <DataManagementSection />}
        {activeTab === "companies" && <CompaniesSection />}
        {activeTab === "integrations" && <IntegrationsModule />}
      </main>
    </div>
  );
}
