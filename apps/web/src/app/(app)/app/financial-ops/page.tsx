import { redirect } from "next/navigation";
import { MODULE_BASE_PATH } from "@/lib/navigation/module-paths";

/** Legacy `financial-ops` module id → ledger treasury sub-view (B0R-4). */
export default function FinancialOpsAliasPage() {
  redirect(MODULE_BASE_PATH["financial-ops"]);
}
