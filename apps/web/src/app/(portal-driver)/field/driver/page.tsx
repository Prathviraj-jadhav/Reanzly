"use client";

import { DriverFieldApp } from "@/components/modules/driver-field";
import { DRIVER_DEFAULT_TAB } from "@/lib/navigation/portal-paths";
import { useDriverFieldNavigation } from "@/lib/navigation/use-portal-navigation";

export default function DriverFieldPage() {
  const nav = useDriverFieldNavigation(DRIVER_DEFAULT_TAB);
  return <DriverFieldApp {...nav} />;
}
