"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  Palette, Moon, Sun, Monitor, Upload, RotateCcw, Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";

const GREY_PALETTES = [
  {
    id: "ink",
    name: "Ink & Paper",
    description: "Pure black on white. Maximum contrast, Swiss editorial.",
    light: { bg: "#ffffff", fg: "#171717", muted: "#f5f5f5", border: "#e5e5e5" },
    dark: { bg: "#1c1c1c", fg: "#fafafa", muted: "#262626", border: "#2e2e2e" },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Off-black on warm white. Softer for long sessions.",
    light: { bg: "#fafaf9", fg: "#1c1917", muted: "#f5f5f4", border: "#e7e5e4" },
    dark: { bg: "#1c1917", fg: "#fafaf9", muted: "#292524", border: "#3f3f3e" },
  },
  {
    id: "steel",
    name: "Steel",
    description: "Cool blue-grey. Technical, instrument-panel feel.",
    light: { bg: "#f8fafc", fg: "#0f172a", muted: "#f1f5f9", border: "#e2e8f0" },
    dark: { bg: "#0f172a", fg: "#f8fafc", muted: "#1e293b", border: "#334155" },
  },
  {
    id: "warm",
    name: "Warm Grey",
    description: "Soft sepia-tinted greys. Reduces eye fatigue.",
    light: { bg: "#fafaf7", fg: "#1a1a1a", muted: "#f0efeb", border: "#e0dfd9" },
    dark: { bg: "#1a1a1a", fg: "#fafaf7", muted: "#262626", border: "#3a3a37" },
  },
];

type ThemeMode = "light" | "dark" | "system";
type Density = "comfortable" | "compact";
type FontSize = "small" | "medium" | "large";

export function AppearanceSection() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [palette, setPalette] = useState("ink");
  const [density, setDensity] = useState<Density>("comfortable");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const { currentRole } = useAppStore();
  const isAdmin = currentRole.id === "owner";

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    toast.success(`Theme set to ${mode}`, { description: "Live preview updates immediately." });
  };

  const handlePalette = (id: string) => {
    setPalette(id);
    const p = GREY_PALETTES.find((g) => g.id === id);
    toast.success(`Palette: ${p?.name}`, { description: p?.description });
  };

  const handleDensity = (d: Density) => {
    setDensity(d);
    toast.success(`Density: ${d}`, { description: d === "compact" ? "Tighter rows, more per screen." : "Relaxed spacing for long sessions." });
  };

  const handleFontSize = (s: FontSize) => {
    setFontSize(s);
    toast.success(`Font size: ${s}`, { description: "Applies to body text and form labels." });
  };

  const handleLogo = () => toast("Logo upload", { description: "PNG/SVG, transparent background, max 200x40px." });
  const handleReset = () => {
    setTheme("dark");
    setPalette("ink");
    setDensity("comfortable");
    setFontSize("medium");
    toast("Reset to defaults", { description: "Ink & Paper palette, dark theme, comfortable density, medium font." });
  };

  const activePalette = GREY_PALETTES.find((p) => p.id === palette) || GREY_PALETTES[0];
  const previewColors = theme === "light" ? activePalette.light : theme === "dark" ? activePalette.dark : activePalette.dark;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Appearance</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Theme, density, font size, logo. Monochrome only.</p>
        </div>
        <Btn icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>Reset to Default</Btn>
      </div>

      {/* Theme mode */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Theme Mode</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ThemeCard active={theme === "light"} onClick={() => handleThemeChange("light")} icon={<Sun className="h-4 w-4" />} label="Light" />
          <ThemeCard active={theme === "dark"} onClick={() => handleThemeChange("dark")} icon={<Moon className="h-4 w-4" />} label="Dark" />
          <ThemeCard active={theme === "system"} onClick={() => handleThemeChange("system")} icon={<Monitor className="h-4 w-4" />} label="System" />
        </div>
      </div>

      {/* Palette picker */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Greyscale Palette</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Monochrome - no hue</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {GREY_PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePalette(p.id)}
              className={
                "flex items-start gap-3 rounded-[6px] border p-3 text-left transition-colors " +
                (palette === p.id
                  ? "border-foreground bg-accent/40"
                  : "border-border hover:bg-accent/30")
              }
            >
              <div className="flex flex-col gap-1">
                <div className="h-6 w-6 rounded-[3px] border border-border" style={{ background: p.light.bg }} />
                <div className="h-6 w-6 rounded-[3px] border border-border" style={{ background: p.dark.bg }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-medium text-foreground">{p.name}</h4>
                  {palette === p.id && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Density & font size */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Density &amp; Typography</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-2 block">Density</label>
            <div className="grid grid-cols-2 gap-2">
              {(["comfortable", "compact"] as Density[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDensity(d)}
                  className={
                    "rounded-[5px] border px-3 py-2 text-[12px] font-medium capitalize transition-colors " +
                    (density === d
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {density === "compact"
                ? "Compact rows save vertical space - ideal for fleet dispatchers."
                : "Comfortable spacing improves readability on long shifts."}
            </p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-2 block">Font Size</label>
            <div className="grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as FontSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleFontSize(s)}
                  className={
                    "rounded-[5px] border px-3 py-2 text-[12px] font-medium capitalize transition-colors " +
                    (fontSize === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  <span className={s === "small" ? "text-[11px]" : s === "large" ? "text-[14px]" : "text-[13px]"}>Aa</span>
                  <span className="ml-1.5">{s}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Scales body text, labels, and form inputs.</p>
          </div>
        </div>
      </div>

      {/* Logo upload (admin) */}
      {isAdmin && (
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Company Logo</h3>
            <span className="text-[10px] text-muted-foreground border border-border rounded-[3px] px-1.5 py-0.5">Admin only</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-40 items-center justify-center rounded-[6px] border border-border bg-background">
              <span className="text-[14px] font-medium text-foreground tracking-tight">GARAGE PLUS</span>
            </div>
            <div className="flex flex-col gap-2">
              <Btn size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={handleLogo}>Upload Logo</Btn>
              <p className="text-[11px] text-muted-foreground">PNG/SVG - transparent background - 200x40px recommended</p>
            </div>
          </div>
        </div>
      )}

      {/* Live preview */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Live Preview</h3>
        </div>
        <div className="p-4">
          <div className="rounded-[6px] border border-border overflow-hidden" style={{ background: previewColors.bg }}>
            {/* Mock header */}
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: previewColors.border }}>
              <span style={{ color: previewColors.fg }} className="text-[13px] font-medium">GARAGE PLUS</span>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-12 rounded-[3px]" style={{ background: previewColors.muted }} />
                <div className="h-5 w-5 rounded-full" style={{ background: previewColors.fg }} />
              </div>
            </div>
            {/* Mock content */}
            <div className="p-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[4px] border p-2" style={{ borderColor: previewColors.border, background: previewColors.bg }}>
                  <div className="h-1.5 w-10 rounded-full mb-1.5" style={{ background: previewColors.muted }} />
                  <div className="h-3 w-16 rounded-full mb-2" style={{ background: previewColors.fg }} />
                  <div className="h-1 w-full rounded-full" style={{ background: previewColors.muted }} />
                </div>
              ))}
            </div>
            {/* Mock button */}
            <div className="px-3 pb-3 flex gap-2">
              <div className="h-7 px-3 flex items-center rounded-[5px]" style={{ background: previewColors.fg }}>
                <span className="text-[11px] font-medium" style={{ color: previewColors.bg }}>Primary</span>
              </div>
              <div className="h-7 px-3 flex items-center rounded-[5px] border" style={{ borderColor: previewColors.border, background: previewColors.bg }}>
                <span className="text-[11px] font-medium" style={{ color: previewColors.fg }}>Outline</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Preview shows {activePalette.name} in {theme === "system" ? "dark (current system)" : theme} mode - {density} density - {fontSize} font.
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-col items-center gap-2 rounded-[6px] border p-3 transition-colors " +
        (active ? "border-foreground bg-accent/40" : "border-border hover:bg-accent/30")
      }
    >
      <div className={"flex h-8 w-8 items-center justify-center rounded-[5px] border " + (active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>
        {icon}
      </div>
      <span className={"text-[12px] font-medium " + (active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}
