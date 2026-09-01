"use client";

import Image from "next/image";

const sections = [
  {
    title: "Platform",
    links: ["Trips & Dispatch", "Fleet Management", "Billing & GST", "GPS Tracking", "Driver Payroll"],
  },
  {
    title: "Solutions",
    links: ["Transport Companies", "Freight Brokers", "3PL Operators", "Cold Chain", "Enterprise"],
  },
  {
    title: "Compare",
    links: ["vs. Tally", "vs. LocoNav", "vs. Fleetx", "vs. Spreadsheets"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Case Studies", "Blog", "Contact Sales"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Security", "DPDP Compliance"],
  },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white pt-16 pb-10" style={{ borderTop: "1px solid #ededed" }}>
      <div className="mx-auto max-w-[1280px] px-6">

        {/* Brand row */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#09110D]">
                <Image src="/logo.png" alt="Reanzly" width={24} height={24} className="h-6 w-6 object-contain" />
              </div>
              <span className="text-[17px] font-[500] text-[#171717]" style={{ letterSpacing: "-0.3px" }}>
                Reanzly
              </span>
            </div>
            <p className="max-w-[240px] text-[13px] font-[400] leading-[1.45] text-[#9a9a9a]">
              AI-native logistics OS for Indian transport companies.
            </p>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            {["LinkedIn", "Twitter", "YouTube"].map((s) => (
              <a key={s} href="#"
                className="text-[13px] text-[#9a9a9a] transition-colors hover:text-[#171717]">
                {s}
              </a>
            ))}
          </div>
        </div>

        {/* Hairline */}
        <div className="mb-10 h-px bg-[#ededed]" />

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-4 text-[11px] font-[500] uppercase tracking-[0.15em] text-[#9a9a9a]">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-[13px] text-[#707070] transition-colors hover:text-[#171717]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-[#ededed] pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#09110D]">
              <Image src="/logo.png" alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
            </div>
            <p className="text-[12px] text-[#b2b2b2]">
              © {year} Reanzly. All rights reserved.
            </p>
          </div>
          <p className="text-[12px] text-[#b2b2b2]">Made for Indian roads.</p>
        </div>

      </div>
    </footer>
  );
}
