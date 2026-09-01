"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

/* ============================================================
   Autocomplete - typed combobox for forms.
   Built on Popover + Command (cmdk). Strict monochrome Swiss:
   hairline border, ≤6px radius, no shadow, tabular-safe spacing.

   Usage:
     <Autocomplete
       value={form.customer}
       onChange={(v) => update("customer", v)}
       options={CUSTOMERS.map(c => ({ value: c.companyName, label: c.companyName, hint: c.city }))}
       placeholder="Select customer"
     />

   • Allows free-typed values (creatable-style): if the user types
     something that isn't in the list, the value is still kept.
   • Mobile-friendly: trigger is a full-width button; popover uses
     Radix's responsive width via `w-full`.
   ============================================================ */

export interface AutocompleteOption {
  value: string;
  label: string;
  hint?: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  /** Disable free-text entry; restrict to listed options. */
  restrictToList?: boolean;
  disabled?: boolean;
  /** Render the trigger as a bare input-like field (no chevron). */
  bare?: boolean;
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyText = "No matches found",
  className,
  restrictToList = false,
  disabled,
  bare,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const selectedLabel = React.useMemo(() => {
    const match = options.find((o) => o.value === value);
    return match ? match.label : value;
  }, [options, value]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-3 text-[13px] text-left transition-colors",
            "hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
            disabled && "cursor-not-allowed opacity-50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className={cn("truncate", bare && "tabular")}>
            {value ? selectedLabel : placeholder}
          </span>
          {!bare && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] min-w-[220px] rounded-[6px] border border-border bg-popover p-0 shadow-none"
      >
        <Command shouldFilter={false} className="rounded-[6px]">
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
            className="h-9 text-[13px]"
          />
          <CommandList className="max-h-[260px]">
            <CommandEmpty className="py-4 text-center text-[12px] text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => handleSelect(o.value)}
                  className="text-[13px]"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-foreground">{o.label}</span>
                    {o.hint && (
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                        {o.hint}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {!restrictToList && query.trim() && filtered.length === 0 && (
              <CommandGroup>
                <CommandItem
                  value={`__custom__:${query}`}
                  onSelect={() => handleSelect(query.trim())}
                  className="text-[13px] text-muted-foreground"
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center text-[12px]">+</span>
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
