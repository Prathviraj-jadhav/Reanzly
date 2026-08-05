"use client";

import { cn } from "@/lib/utils";
import {
  useState,
  useMemo,
  useCallback,
  Fragment,
  type ReactNode,
} from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Columns3,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "./empty-state";
import { BtnGroup, BtnGroupItem } from "./btn";
import { SearchInput } from "./toolbar";

/* ============================================================
   DataTable - production-grade data surface for Reanzly.
   Used by ~12 module lists (trips, vehicles, invoices, …).

   UX laws applied (cite):
   • Fitts's Law            - sticky header, 44px row comfort,
                              ≥28px checkbox / row-action targets.
   • Hick's Law             - Columns dropdown hides noisy columns;
                              page-size selector caps choices at 4.
   • Aesthetic-Usability    - Comfortable / Compact density toggle;
                              `tap` feedback on every row.
   • Doherty Threshold      - instant useMemo filter/sort; subtle
                              hover bg; pagination keeps lists short.
   • Law of Proximity       - toolbar split into 3 zones (search +
                              filters · spacer · density + columns +
                              count) with consistent gap-2.
   • Serial Position Effect - pagination footer (recency) shows
                              "Showing 1–25 of 142" + page numbers;
                              page-size selector 10/25/50/100.
   • Von Restorff Effect    - sorted column = filled chevron; active
                              filter chips invert (bg-foreground).
   • Law of Common Region   - bordered card wrap with hairline
                              divider between header row and body.
   • Mobile responsiveness  - < 640px renders stacked card list;
                              table is hidden sm:block.
   • Keyboard navigation    - ↑/↓ moves focus across rows, Enter
                              triggers onRowClick, Escape clears
                              selection. role="grid" semantics.
   ============================================================ */

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  /** When true, this column is hidden inside the mobile card view. */
  hideOnMobile?: boolean;
  /** When true, this column appears in the Columns visibility dropdown so
   *  users can hide/show it (Hick's Law). When false (default) the column
   *  is treated as essential and never listed in the dropdown. */
  hideable?: boolean;
  /** When true, this column sticks to the left edge on horizontal scroll.
   *  Typically set on the primary identifier column. */
  sticky?: boolean;
}

export interface DataTableFilter<T> {
  label: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
  accessor: (row: T) => string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: DataTableFilter<T>[];
  onRowClick?: (row: T) => void;
  rowActions?: { label: string; onClick: (row: T) => void; destructive?: boolean }[];
  bulkActions?: { label: string; onClick: (rows: T[]) => void }[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Page size for pagination. Default 25. */
  pageSize?: number;
  density?: "comfortable" | "compact";
  /** When true, shows the Columns (visibility) dropdown in the toolbar.
   *  NOTE: as of v2 the Columns dropdown is ALWAYS visible - this prop is
   *  kept for backward compatibility but no longer gates anything. */
  hideableColumns?: boolean;
  initialSort?: { key: string; dir: "asc" | "desc" };
  /** When true, renders 8 monochrome skeleton rows instead of data. */
  loading?: boolean;
  /** When provided, rows become expandable to reveal extra detail. */
  expandable?: { render: (row: T) => ReactNode };
  /** When true, render alternating row stripes (even:bg-muted/20) for
   *  scannability on long lists. Default false (cleaner default; the
   *  hover affordance + hairline divider is enough on short lists). */
  zebra?: boolean;
  /** When true, the first column sticks to the left edge during
   *  horizontal scroll so the row's primary identifier stays visible.
   *  Default false. Equivalent to marking the first column `sticky: true`. */
  stickyFirstColumn?: boolean;
  /** Optional max-height (Tailwind class, e.g. "max-h-[60vh]") that wraps
   *  the table body so the sticky header has a vertical scroll container.
   *  Without this, thead sticky top-0 only fires when the page itself
   *  scrolls past it. */
  scrollBodyClassName?: string;
}

type Density = "comfortable" | "compact";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Build a capped (≤7) page range with leading/trailing ellipses. */
function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "ellipsis")[] = [1];
  if (current > 4) out.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 3) out.push("ellipsis");
  out.push(total);
  return out;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKeys,
  searchPlaceholder = "Search…",
  filters = [],
  onRowClick,
  rowActions = [],
  bulkActions = [],
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will show up here once they're created.",
  emptyAction,
  pageSize: pageSizeProp = 25,
  density: densityProp = "comfortable",
  hideableColumns: _hideableColumns = false,
  initialSort,
  loading = false,
  expandable,
  zebra = false,
  stickyFirstColumn = false,
  scrollBodyClassName,
}: DataTableProps<T>) {
  // _hideableColumns kept for backward compat - Columns dropdown is now always visible.
  void _hideableColumns;
  /* ----- state ----- */
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(initialSort?.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort?.dir || "asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    PAGE_SIZE_OPTIONS.includes(pageSizeProp) ? pageSizeProp : 25,
  );
  const [density, setDensity] = useState<Density>(densityProp);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* ----- derived: visible columns (column visibility / Hick's Law) ----- */
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c.key)),
    [columns, hiddenColumns],
  );

  /* ----- derived: filtered + sorted (Doherty threshold - instant) ----- */
  const filtered = useMemo(() => {
    let result = data;
    if (search && searchKeys) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      );
    }
    for (const [key, val] of Object.entries(activeFilters)) {
      if (val && val !== "All") {
        const f = filters.find((f) => f.label === key);
        if (f) result = result.filter((row) => f.accessor(row) === val);
      }
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        result = [...result].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return result;
  }, [data, search, searchKeys, activeFilters, filters, sortKey, sortDir, columns]);

  /* ----- derived: pagination (Serial Position Effect - recency) ----- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const paged = useMemo(
    () => filtered.slice(pageStart, pageEnd),
    [filtered, pageStart, pageEnd],
  );

  /* ----- effects: reset page on filter/search/data change -----
     Using React's "adjust state during render" pattern (avoids
     setState-in-effect cascading renders). Resets page → 1 and
     focus → -1 whenever the working set or page size changes. */
  const [resetKey, setResetKey] = useState({
    search,
    activeFilters,
    data,
    pageSize,
  });
  if (
    resetKey.search !== search ||
    resetKey.activeFilters !== activeFilters ||
    resetKey.data !== data ||
    resetKey.pageSize !== pageSize
  ) {
    setResetKey({ search, activeFilters, data, pageSize });
    setPage(1);
    setFocusedIndex(-1);
  }

  /* Clamp focus into the current page bounds (derived, no effect). */
  const clampedFocused =
    paged.length === 0 ? -1 : focusedIndex < 0 ? -1 : Math.min(focusedIndex, paged.length - 1);

  /* ----- handlers ----- */
  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((s) =>
      s.size === paged.length && paged.length > 0
        ? new Set()
        : new Set(paged.map((r) => r.id)),
    );
  };

  const selectedRows = filtered.filter((r) => selected.has(r.id));

  const hasActiveFilters = Object.values(activeFilters).some(
    (v) => v && v !== "All",
  );

  const clearFilter = (label: string) => {
    setActiveFilters((p) => {
      const next = { ...p };
      delete next[label];
      return next;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearch("");
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ----- keyboard navigation (↑/↓/Enter/Escape) ----- */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (paged.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i < 0 ? 0 : Math.min(i + 1, paged.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? 0 : i - 1));
    } else if (e.key === "Enter") {
      if (
        clampedFocused >= 0 &&
        clampedFocused < paged.length &&
        onRowClick
      ) {
        e.preventDefault();
        onRowClick(paged[clampedFocused]);
      }
    } else if (e.key === "Escape") {
      if (selected.size > 0) {
        setSelected(new Set());
      } else if (clampedFocused !== -1) {
        setFocusedIndex(-1);
      }
    }
  };

  /* ----- density classmaps (Aesthetic-Usability) -----
     Task spec: compact = py-1 text-[12px], comfortable = py-2.5 text-[13px].
     Head padding matches; the row text size is enforced via the cell
     text size class. */
  const cellPad = density === "compact" ? "py-1" : "py-2.5";
  const cellText = density === "compact" ? "text-[12px]" : "text-[13px]";
  const headPad = density === "compact" ? "py-1" : "py-2.5";
  // Zebra striping is now controlled by an explicit `zebra` prop (default
  // false) rather than derived from density - keeps short lists clean.
  const showZebra = zebra;

  /* ----- shared empty-state ----- */
  const isFilteredEmpty =
    filtered.length === 0 &&
    (!!search || hasActiveFilters);
  const showEmpty = filtered.length === 0;

  /* ----- toolbar always renders; left zone only when search/filters present -----
     Right zone (density + columns + count) ALWAYS renders so modules using
     a custom filter bar above still get density + column controls. */
  const hasLeftZone = !!searchKeys || filters.length > 0;
  const showToolbar = true; // always render the toolbar container

  return (
    <div className="flex flex-col">
      {/* ============================================================
          TOOLBAR - Law of Proximity (3 zones: left · spacer · right)
          ============================================================ */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 bg-[var(--rz-surface)] border-b border-[var(--rz-border-subtle)] px-3 py-2.5">
          {/* Zone 1 - search + filters (only when provided) */}
          {hasLeftZone && searchKeys && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
            />
          )}
          {hasLeftZone && filters.map((f) => {
            const current = activeFilters[f.label] || "All";
            const active = current !== "All";
            return (
              <DropdownMenu key={f.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-[2px] border px-2.5 text-[12px] font-medium transition-colors duration-100 tap",
                      active
                        ? "border-foreground text-foreground"
                        : "border-border text-foreground hover:bg-accent",
                    )}
                  >
                    <span className="text-muted-foreground">{f.label}:</span>
                    <span className="max-w-[110px] truncate">{current}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveFilters((p) => ({ ...p, [f.label]: "All" }));
                      f.onChange?.("All");
                    }}
                    className="text-[13px]"
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {f.options.map((opt) => (
                    <DropdownMenuItem
                      key={opt}
                      onClick={() => {
                        setActiveFilters((p) => ({ ...p, [f.label]: opt }));
                        f.onChange?.(opt);
                      }}
                      className="text-[13px]"
                    >
                      {opt}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
          {/* Active filter chips - Von Restorff (inverted) */}
          {hasLeftZone && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(activeFilters).map(([label, val]) =>
                val && val !== "All" ? (
                  <button
                    key={label}
                    onClick={() => clearFilter(label)}
                    className="inline-flex h-6 items-center gap-1 rounded-full bg-foreground px-2 text-[11px] font-medium text-background transition-colors tap hover:bg-foreground/85"
                  >
                    <span className="text-background/70">{label}:</span>
                    <span className="max-w-[90px] truncate">{val}</span>
                    <X className="h-3 w-3" />
                  </button>
                ) : null,
              )}
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground tap"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Zone 2 - spacer */}
          <div className="flex-1" />

          {/* Zone 3 - density + columns + count (ALWAYS visible) */}
          <BtnGroup>
            <BtnGroupItem
              active={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
            >
              Comfortable
            </BtnGroupItem>
            <BtnGroupItem
              active={density === "compact"}
              onClick={() => setDensity("compact")}
            >
              Compact
            </BtnGroupItem>
          </BtnGroup>

          {/* Columns dropdown - always visible (Hick's Law: let users hide noise) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 items-center gap-1.5 rounded-[2px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors duration-100 tap">
                <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                Columns
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Toggle columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/*
                Hick's Law - only columns explicitly marked `hideable: true`
                surface in the dropdown. Essential identifier / status columns
                stay pinned and out of the user's way.
              */}
              {columns.filter((c) => c.hideable).length === 0 ? (
                <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                  No hideable columns
                </div>
              ) : (
                columns
                  .filter((c) => c.hideable)
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={!hiddenColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="text-[13px]"
                    >
                      {col.header}
                    </DropdownMenuCheckboxItem>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="font-mono text-[10px] text-[var(--rz-text-dim)] tabular">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-foreground" />
                Loading…
              </span>
            ) : (
              <>
                <span className="tabular-nums">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "record" : "records"}
                {filtered.length !== data.length && (
                  <span className="text-muted-foreground/60"> (of <span className="tabular-nums">{data.length}</span>)</span>
                )}
                {selectedRows.length > 0 && (
                  <span className="ml-2 text-foreground">· <span className="tabular-nums">{selectedRows.length}</span> selected</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          BULK ACTION BAR - sticky at bottom when rows selected
          (Fitts's Law: prominent, always reachable)
          ============================================================ */}
      {selectedRows.length > 0 && (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-foreground bg-background px-4 py-2.5">
          <span className="flex h-6 items-center rounded-full bg-foreground px-2.5 text-[11px] font-semibold tabular text-background">
            {selectedRows.length} selected
          </span>
          <div className="flex items-center gap-1">
            {bulkActions.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.onClick(selectedRows);
                  setSelected(new Set());
                }}
                className="flex h-7 items-center rounded-[2px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-foreground hover:text-background transition-colors duration-100 tap"
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[12px] text-muted-foreground hover:text-foreground tap"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ============================================================
          BODY - loading skeleton | empty state | mobile cards + desktop table
          ============================================================ */}
      {loading ? (
        /* ----- LOADING SKELETON (8 pulse rows, monochrome) ----- */
        <div className={cn("hidden sm:block", scrollBodyClassName)}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-[var(--rz-surface)]">
              <tr className="border-b border-border">
                {bulkActions.length > 0 && <th className={cn("w-10 px-3", headPad)} />}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 text-left text-[11px] font-medium uppercase tracking-[0.5px] font-mono text-[var(--rz-text-dim)]",
                      headPad,
                    )}
                    style={{ width: col.width }}
                  >
                    <div className="h-3 w-20 animate-pulse rounded-[3px] bg-muted" />
                  </th>
                ))}
                {rowActions.length > 0 && <th className={cn("w-10 px-3", headPad)} />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, ri) => (
                <tr key={ri} className={cn(showZebra && ri % 2 === 1 && "bg-[var(--rz-hover)]")}>
                  {bulkActions.length > 0 && (
                    <td className="px-3 align-middle">
                      <div className="h-4 w-4 animate-pulse rounded-[2px] bg-muted" />
                    </td>
                  )}
                  {visibleColumns.map((col, ci) => (
                    <td key={col.key} className={cn("px-3 align-middle", cellPad)}>
                      <div
                        className={cn("h-3.5 animate-pulse rounded-[3px] bg-muted", cellText)}
                        style={{ width: `${[70, 45, 60, 35, 80, 50, 65][ci % 7]}%` }}
                      />
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="px-3 align-middle">
                      <div className="h-4 w-4 animate-pulse rounded-[2px] bg-muted" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile skeleton */}
          <div className="divide-y divide-border sm:hidden">
            {Array.from({ length: 5 }).map((_, ri) => (
              <div key={ri} className="space-y-2 px-3 py-3">
                <div className="h-4 w-2/3 animate-pulse rounded-[3px] bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-[3px] bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : showEmpty ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={isFilteredEmpty ? "No matching records" : emptyTitle}
          description={
            isFilteredEmpty
              ? "Try adjusting your search or filters."
              : emptyDescription
          }
          action={emptyAction}
          className="py-14"
        />
      ) : (
        <>
          {/* ----- MOBILE CARD LIST (< 640px) ----- */}
          <div
            role="grid"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="sm:hidden divide-y divide-border border-b border-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {paged.map((row, idx) => {
              const mobileCols = visibleColumns.filter(
                (c) => !c.hideOnMobile,
              );
              const primary = mobileCols[0];
              const rest = mobileCols.slice(1, 4);
              const isFocused = clampedFocused === idx;
              const isSelected = selected.has(row.id);
              return (
                <div
                  key={row.id}
                  role="row"
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "group relative flex flex-col gap-1.5 px-3 py-3 transition-colors duration-75 tap",
                    onRowClick && "cursor-pointer",
                    isFocused && "bg-[var(--rz-hover-strong)]",
                    !isFocused && isSelected && "bg-[var(--rz-hover)]",
                    !isFocused && !isSelected && "hover:bg-[var(--rz-hover)]",
                  )}
                >
                  {/* top row: primary field + actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {primary && (
                        <div className="text-[14px] font-semibold leading-tight text-foreground">
                          {primary.render(row)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {bulkActions.length > 0 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(row.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(row.id)}
                            className="h-4 w-4"
                          />
                        </span>
                      )}
                      {rowActions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {rowActions.map((a) => (
                              <DropdownMenuItem
                                key={a.label}
                                onClick={() => a.onClick(row)}
                                className={cn(
                                  "text-[13px]",
                                  a.destructive && "text-foreground font-medium",
                                )}
                              >
                                {a.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {onRowClick && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                  {/* secondary fields - stacked label / value */}
                  {rest.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {rest.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {col.header}
                          </dt>
                          <dd className="truncate text-[12px] text-foreground">
                            {col.render(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>

          {/* ----- DESKTOP TABLE (≥ 640px) -----
              When `scrollBodyClassName` is provided (e.g. "max-h-[60vh]"), the
              table sits inside a vertical scroll container so the sticky
              thead + sticky first column both fire. Otherwise the table fills
              the parent and the sticky thead latches onto the page scroll. */}
          <div
            role="grid"
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-rowcount={paged.length + 1}
            className={cn(
              "hidden overflow-auto scrollbar-thin outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:block",
              scrollBodyClassName,
            )}
          >
            <table className="w-full border-collapse">
              {/* Sticky header - Fitts's Law (stays visible) + hairline anchor.
                  bg-card matches the surrounding card wrapper so the sticky
                  band doesn't read as a separate white block on scroll. */}
              <thead className="sticky top-0 z-20 bg-[var(--rz-surface)]">
                <tr className="border-b border-border" role="row">
                  {expandable && (
                    <th className={cn("w-8 px-2", headPad)} role="columnheader" />
                  )}
                  {bulkActions.length > 0 && (
                    <th
                      className={cn("w-10 px-3 text-left", headPad)}
                      role="columnheader"
                    >
                      <Checkbox
                        checked={
                          selected.size > 0 &&
                          selected.size === paged.length &&
                          paged.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  {visibleColumns.map((col, ci) => {
                    const isSticky = col.sticky || (stickyFirstColumn && ci === 0);
                    return (
                      <th
                        key={col.key}
                        role="columnheader"
                        className={cn(
                          "px-3 text-left text-[11px] font-medium uppercase tracking-[0.5px] font-mono text-[var(--rz-text-muted)]",
                          headPad,
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.sortable &&
                            "cursor-pointer select-none hover:text-foreground transition-colors duration-75",
                          isSticky &&
                            "sticky left-0 z-10 bg-[var(--rz-surface)] shadow-[1px_0_0_0_var(--border)]",
                        )}
                        style={{ width: col.width }}
                        onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            col.align === "right" && "justify-end",
                            col.align === "center" && "justify-center",
                          )}
                        >
                          {col.header}
                          {col.sortable && (
                            <span
                              className={cn(
                                sortKey === col.key
                                  ? "text-foreground"
                                  : "text-muted-foreground/50",
                              )}
                            >
                              {sortKey === col.key ? (
                                sortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  {rowActions.length > 0 && (
                    <th className={cn("w-10 px-3", headPad)} role="columnheader" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border" role="rowgroup">
                {paged.map((row, idx) => {
                  const isFocused = clampedFocused === idx;
                  const isSelected = selected.has(row.id);
                  const isExpanded = expanded.has(row.id);
                  return (
                    <Fragment key={row.id}>
                    <tr
                      role="row"
                      tabIndex={0}
                      aria-selected={isSelected || undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && onRowClick) {
                          e.preventDefault();
                          e.stopPropagation();
                          onRowClick(row);
                        }
                      }}
                      className={cn(
                        "group transition-colors duration-75 tap",
                        onRowClick && "cursor-pointer",
                        showZebra && idx % 2 === 1 && !isSelected && !isFocused && "bg-[var(--rz-hover)]",
                        !isFocused && isSelected && "bg-[var(--rz-hover)]",
                        isFocused && "bg-[var(--rz-hover-strong)]",
                        !isFocused && !isSelected && "hover:bg-[var(--rz-hover)]",
                        isExpanded && "bg-[var(--rz-hover)]",
                        // Hover left-border accent via inset shadow (Law of Common Region)
                        "hover:shadow-[inset_2px_0_0_0_var(--foreground)]",
                      )}
                    >
                      {expandable && (
                        <td className="px-2 align-middle" onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                            aria-expanded={isExpanded}
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                          </button>
                        </td>
                      )}
                      {bulkActions.length > 0 && (
                        <td
                          className="px-3 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex h-8 w-8 items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(row.id)}
                              className="h-4 w-4"
                              aria-label="Select row"
                            />
                          </div>
                        </td>
                      )}
                      {visibleColumns.map((col, ci) => {
                        const isSticky = col.sticky || (stickyFirstColumn && ci === 0);
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-3 text-foreground align-middle",
                              cellPad,
                              cellText,
                              col.align === "right" && "text-right tabular",
                              col.align === "center" && "text-center",
                              isSticky &&
                                "sticky left-0 z-10 bg-card shadow-[1px_0_0_0_var(--border)]",
                              isSticky && isSelected && "bg-[var(--rz-hover)]",
                              isSticky && isFocused && "bg-[var(--rz-hover-strong)]",
                            )}
                          >
                            {col.render(row)}
                          </td>
                        );
                      })}
                      {rowActions.length > 0 && (
                        <td
                          className="px-3 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
                                aria-label="Row actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {rowActions.map((a) => (
                                <DropdownMenuItem
                                  key={a.label}
                                  onClick={() => a.onClick(row)}
                                  className={cn(
                                    "text-[13px]",
                                    a.destructive && "text-foreground font-medium",
                                  )}
                                >
                                  {a.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                    {/* Expanded detail row */}
                    {expandable && isExpanded && (
                      <tr role="row" className="bg-background">
                        <td colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0) + (rowActions.length > 0 ? 1 : 0) + (expandable ? 1 : 0)} className="border-b border-border px-4 py-4">
                          <div className="rounded-[3px] border border-border bg-accent/20 p-4">
                            {expandable.render(row)}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ============================================================
              PAGINATION FOOTER - Serial Position Effect (recency).
              Also surfaces the running selection count so the user
              always knows how many rows are checked without scrolling
              back to the bulk action bar.
              ============================================================ */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
              <div className="text-[12px] text-muted-foreground tabular tabular-nums">
                Showing{" "}
                <span className="text-foreground">{pageStart + 1}</span>–
                <span className="text-foreground">{pageEnd}</span> of{" "}
                <span className="text-foreground">{filtered.length}</span>
                {selectedRows.length > 0 && (
                  <span className="ml-2 text-foreground">· <span className="tabular-nums">{selectedRows.length}</span> selected</span>
                )}
              </div>

              {/* page-size selector - Hick's Law (4 choices) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Rows</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-7 items-center gap-1 rounded-[2px] border border-border px-2 text-[12px] font-medium text-foreground hover:bg-accent transition-colors duration-100 tabular tap">
                      {pageSize}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-24">
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setPageSize(opt)}
                        className={cn(
                          "text-[13px] tabular",
                          opt === pageSize && "font-semibold",
                        )}
                      >
                        {opt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1" />

              {/* prev / page numbers / next */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setFocusedIndex(-1);
                  }}
                  disabled={safePage <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none tap"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {getPageRange(safePage, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="flex h-7 w-7 items-center justify-center text-[12px] text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => {
                        setPage(p);
                        setFocusedIndex(-1);
                      }}
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-[2px] border px-2 text-[12px] font-medium tabular transition-colors duration-100 tap",
                        p === safePage
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:bg-accent",
                      )}
                      aria-current={p === safePage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    setFocusedIndex(-1);
                  }}
                  disabled={safePage >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none tap"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
