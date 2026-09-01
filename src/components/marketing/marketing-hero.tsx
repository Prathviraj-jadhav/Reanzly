"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";

const ROTATING_PHRASES = [
  "dispatch itself.",
  "invoice instantly.",
  "track everything.",
  "stop the chaos.",
  "cut cost/km.",
];

export function MarketingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const src = "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % ROTATING_PHRASES.length);
        setVisible(true);
      }, 250);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-black pt-[60px] min-h-screen flex flex-col justify-center">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          className="h-full w-full object-cover"
        />
        {/* Black shade overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 pt-20 pb-16 md:pt-28">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1AA06D]" />
          <span className="text-[12px] font-[400] text-white/80">AI-native logistics OS. Built to survive Indian roads.</span>
        </div>

        {/* Headline */}
        <h1
          className="mb-6 max-w-[740px] text-[52px] font-[500] leading-[1.08] sm:text-[64px] text-white"
          style={{ letterSpacing: "-1.92px" }}
        >
          Let your fleet{" "}
          <span
            className="transition-opacity duration-200"
            style={{ color: "#1AA06D", opacity: visible ? 1 : 0 }}
          >
            {ROTATING_PHRASES[phraseIdx]}
          </span>
        </h1>

        {/* Sub */}
        <p className="mb-8 max-w-[480px] text-[18px] font-[400] leading-[1.55] text-white/70">
          One platform for dispatch, fleet, billing, and compliance. Your ops team stops firefighting. Your spreadsheets finally retire.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => { setAuthMode("signup"); setMarketingView("auth"); }}
            className="group inline-flex h-11 items-center gap-2 rounded-[6px] bg-white px-6 text-[14px] font-[500] text-black transition-all hover:bg-gray-200"
          >
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => { setAuthMode("signin"); setMarketingView("auth"); }}
            className="inline-flex h-11 items-center rounded-[6px] border border-white/20 bg-white/5 backdrop-blur-md px-6 text-[14px] font-[500] text-white transition-all hover:bg-white/10"
          >
            Sign in
          </button>
          <span className="hidden sm:block text-[13px] text-white/50">No card required. Just guts.</span>
        </div>

        {/* Product mockup (Glassmorphic) */}
        <div className="relative mt-16 overflow-hidden rounded-[16px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          {/* Mockup top bar */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-3 text-[12px] text-white/50">Reanzly Live Dashboard</span>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Active Trips", value: "47", delta: "+3 today", color: "#1AA06D" },
                { label: "Revenue MTD", value: "₹2.4Cr", delta: "↑ 18%", color: "#ffffff" },
                { label: "Cost/km", value: "₹32.4", delta: "↓ from ₹45", color: "#1AA06D" },
                { label: "Invoiced", value: "₹1.8Cr", delta: "Due in 15d", color: "#a3a3a3" },
              ].map((m, i) => (
                <div key={i} className="rounded-[12px] border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
                  <p className="mb-2 text-[12px] text-white/50">{m.label}</p>
                  <p className="text-[24px] font-[500] leading-none" style={{ color: m.color, letterSpacing: "-0.42px" }}>{m.value}</p>
                  <p className="mt-2 text-[12px] text-white/40">{m.delta}</p>
                </div>
              ))}
            </div>
            
            {/* Fake chart placeholder to make it look like a dashboard */}
            <div className="mt-4 h-48 w-full rounded-[12px] border border-white/10 bg-gradient-to-t from-white/5 to-transparent">
              <div className="flex h-full items-end justify-between px-6 pb-6 pt-6 gap-2 opacity-50">
                {[40, 70, 45, 90, 65, 85, 100, 60, 80, 50, 75, 95].map((h, i) => (
                  <div key={i} className="w-full bg-[#1AA06D] rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trust band */}
        <div className="mt-12 mb-0 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-8 pb-4">
          <span className="text-[13px] text-white/50">Trusted by logistics companies across India</span>
          {["VRL Logistics", "Rivigo", "Delhivery", "Mahindra Logistics", "TCI Express"].map((c) => (
            <span key={c} className="text-[13px] font-[500] text-white/40">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
