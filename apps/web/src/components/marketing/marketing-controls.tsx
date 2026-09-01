"use client";

import { Shield, Users, Lock } from "lucide-react";

export function MarketingControls() {
  return (
    <section id="enterprise" className="bg-white py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mb-12">
          <p className="mb-3 text-[13px] uppercase tracking-[0.12em] text-[#9a9a9a]">Enterprise controls</p>
          <h2 className="text-[36px] font-[500] leading-[1.15] md:text-[48px]"
            style={{ letterSpacing: "-1.44px", color: "#171717" }}>
            Your CFO will sleep better.{" "}
            <span style={{ color: "#9a9a9a" }}>Probably.</span>
          </h2>
          <p className="mt-4 max-w-[480px] text-[16px] text-[#707070]">
            Role-based access, full audit logs, private VPC option. Built for fleets of 10 or 10,000.
          </p>
        </div>

        <div className="overflow-hidden rounded-[12px] border border-[#dfdfdf] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {/* Tab bar */}
          <div className="flex items-center gap-6 border-b border-[#ededed] px-8 py-0">
            <button className="border-b-2 border-[#1AA06D] py-4 text-[14px] font-[500] text-[#171717]">
              Role Management
            </button>
            {["Audit Logs", "Budget Tracking"].map((t) => (
              <button key={t} className="border-b-2 border-transparent py-4 text-[14px] text-[#9a9a9a] hover:text-[#707070]">
                {t}
              </button>
            ))}
            <button className="ml-auto rounded-[6px] border border-[#dfdfdf] px-3 py-1.5 text-[12px] font-[500] text-[#707070] hover:bg-[#fafafa]">
              Export CSV
            </button>
          </div>

          <div className="grid gap-4 p-8 md:grid-cols-3">
            {/* Table */}
            <div className="col-span-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a]">
                    <th className="pb-4 font-[400]">Role</th>
                    <th className="pb-4 font-[400]">Branch</th>
                    <th className="pb-4 font-[400]">Financials</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Super Admin", branch: "All Branches", fin: "Full Access", finColor: "#1AA06D" },
                    { role: "Branch Manager", branch: "Mumbai", fin: "View & Approve", finColor: "#707070" },
                    { role: "Fleet Operator", branch: "All Branches", fin: "No Access", finColor: "#b2b2b2" },
                    { role: "Driver", branch: "Assigned route", fin: "No Access", finColor: "#b2b2b2" },
                  ].map((r, i) => (
                    <tr key={i} className="border-t border-[#ededed]">
                      <td className="py-3.5 text-[13px] font-[500] text-[#171717]">{r.role}</td>
                      <td className="py-3.5 text-[13px] text-[#707070]">{r.branch}</td>
                      <td className="py-3.5">
                        <span className="flex items-center gap-1.5 text-[13px] font-[500]" style={{ color: r.finColor }}>
                          {r.fin === "Full Access" && <span className="h-1.5 w-1.5 rounded-full bg-[#1AA06D]" />}
                          {r.fin}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Side cards */}
            <div className="flex flex-col gap-3">
              <div className="flex-1 rounded-[8px] border border-[#ededed] bg-[#fafafa] p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#dfdfdf] bg-white">
                  <Shield className="h-4 w-4 text-[#1AA06D]" />
                </div>
                <p className="mb-1 text-[13px] font-[500] text-[#171717]">SOC2 Type II</p>
                <p className="text-[12px] text-[#707070]">End-to-end encryption. DPDP + GDPR compliant.</p>
              </div>
              <div className="flex-1 rounded-[8px] border border-[#ededed] bg-[#fafafa] p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#dfdfdf] bg-white">
                  <Lock className="h-4 w-4 text-[#707070]" />
                </div>
                <p className="mb-1 text-[13px] font-[500] text-[#171717]">Private VPC</p>
                <p className="text-[12px] text-[#707070]">Deploy within your own cloud. Data never leaves your building.</p>
              </div>
              <div className="flex-1 rounded-[8px] border border-[#ededed] bg-[#fafafa] p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#dfdfdf] bg-white">
                  <Users className="h-4 w-4 text-[#707070]" />
                </div>
                <p className="mb-1 text-[13px] font-[500] text-[#171717]">SSO & MFA</p>
                <p className="text-[12px] text-[#707070]">SAML 2.0, Google Workspace, and Microsoft Entra support.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
