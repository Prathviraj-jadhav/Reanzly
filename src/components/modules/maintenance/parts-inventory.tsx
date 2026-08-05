"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Download,
  Boxes,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  PARTS,
  PART_CATEGORIES,
  formatINR,
} from "./_helpers";

interface PartsInventoryProps {
  onBack: () => void;
  onCreate: () => void;
}

export function PartsInventory({ onBack, onCreate }: PartsInventoryProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = useMemo(() => {
    let r = PARTS;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.number.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q),
      );
    }
    if (categoryFilter.size > 0) r = r.filter((p) => categoryFilter.has(p.category));
    if (lowStockOnly) r = r.filter((p) => p.stock <= p.minLevel);
    return r;
  }, [search, categoryFilter, lowStockOnly]);

  const toggleCategory = (c: string) =>
    setCategoryFilter((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });

  const lowStock = PARTS.filter((p) => p.stock <= p.minLevel);
  const totalValue = PARTS.reduce((s, p) => s + p.stock * p.unitCost, 0);

  const categoryLabel =
    categoryFilter.size === 0 ? "All" : categoryFilter.size === 1 ? Array.from(categoryFilter)[0] : `${categoryFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-7 w-fit items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Maintenance
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">Parts Inventory</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Spare parts stock - auto-flag low stock and trigger re-order alerts below minimum level.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting parts", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>Add Part</Btn>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="rounded-[6px] border border-foreground/30 bg-foreground/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Low Stock Alerts · {lowStock.length} {lowStock.length === 1 ? "item" : "items"} below minimum level
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular truncate">{p.number} · {p.category} · {p.supplier}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground tabular">Stock / Min</div>
                    <div className="text-[13px] tabular font-medium text-foreground">
                      {p.stock} / {p.minLevel}
                    </div>
                  </div>
                  <StatusBadge variant="solid" pulse>Re-order</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Boxes className="h-3.5 w-3.5" />} label="Total Parts" value={String(PARTS.length)} />
        <KpiTile icon={<Package className="h-3.5 w-3.5" />} label="Categories" value={String(PART_CATEGORIES.length)} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Low Stock" value={String(lowStock.length)} hint="below min level" />
        <KpiTile icon={<Download className="h-3.5 w-3.5" />} label="Stock Value" value={formatINR(totalValue)} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part, #, supplier…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[100px] truncate">{categoryLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PART_CATEGORIES.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked={categoryFilter.has(c)} onCheckedChange={() => toggleCategory(c)} className="text-[13px]">
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
              {categoryFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCategoryFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={
              "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
              (lowStockOnly ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-accent")
            }
          >
            <AlertTriangle className="h-3 w-3" />
            Low stock only
          </button>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Part Name</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Part #</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stock</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Min Level</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Unit Cost</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const isLow = p.stock <= p.minLevel;
                return (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-2.5 text-[13px] text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-[12px] tabular text-muted-foreground">{p.number}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2.5 text-[13px] tabular text-right font-medium">{p.stock}</td>
                    <td className="px-4 py-2.5 text-[12px] tabular text-right text-muted-foreground">{p.minLevel}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground truncate max-w-[140px]">{p.supplier}</td>
                    <td className="px-4 py-2.5 text-[13px] tabular text-right">{formatINR(p.unitCost)}</td>
                    <td className="px-4 py-2.5 text-[12px] tabular text-muted-foreground">{p.location}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isLow ? (
                        <StatusBadge variant="solid" pulse>Low</StatusBadge>
                      ) : p.stock <= p.minLevel * 1.5 ? (
                        <StatusBadge variant="outline">Watch</StatusBadge>
                      ) : (
                        <StatusBadge variant="muted">OK</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {PARTS.length} parts across {PART_CATEGORIES.length} categories · {lowStock.length} low stock · total stock value {formatINR(totalValue)}
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
