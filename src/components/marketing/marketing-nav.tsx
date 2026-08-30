"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Product", href: "#product" },
    { label: "Solutions", href: "#solutions" },
    { label: "Enterprise", href: "#enterprise" },
    { label: "Pricing", href: "#pricing" },
  ];

  function openSignup() { setAuthMode("signup"); setMarketingView("auth"); }
  function openLogin() { setAuthMode("login"); setMarketingView("auth"); }

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${
          scrolled ? "border-b border-[#ededed] bg-transparent backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-6">

          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#09110D]">
              <Image src="/logo.png" alt="Reanzly" width={24} height={24} className="h-6 w-6 object-contain" />
            </div>
            <span className="text-[17px] font-[500] tracking-[-0.3px] text-[#171717]">Reanzly</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <a key={l.label} href={l.href}
                className="text-[14px] font-[400] text-[#707070] transition-colors hover:text-[#171717]">
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={openLogin}
              className="h-9 rounded-[6px] px-4 text-[14px] font-[500] text-[#171717] transition-colors hover:bg-[#fafafa]">
              Sign in
            </button>
            <button onClick={openSignup}
              className="h-9 rounded-[6px] bg-white px-4 text-[14px] font-[500] text-black transition-all hover:bg-gray-200">
              Start for free
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-[#707070] hover:text-[#171717]" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#09110D]">
                <Image src="/logo.png" alt="Reanzly" width={24} height={24} className="h-6 w-6 object-contain" />
              </div>
              <span className="text-[17px] font-[500] text-[#171717]">Reanzly</span>
            </div>
            <button className="text-[#707070] hover:text-[#171717]" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-5 border-b border-[#ededed] pb-8">
            {links.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                className="text-[22px] font-[500] text-[#171717]">
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button onClick={() => { setMobileOpen(false); openLogin(); }}
              className="h-11 w-full rounded-[6px] border border-[#dfdfdf] text-[14px] font-[500] text-[#171717]">
              Sign in
            </button>
            <button onClick={() => { setMobileOpen(false); openSignup(); }}
              className="h-11 w-full rounded-[6px] bg-white border border-[#dfdfdf] text-[14px] font-[500] text-black transition-all hover:bg-gray-100">
              Start for free
            </button>
          </div>
        </div>
      )}
    </>
  );
}
