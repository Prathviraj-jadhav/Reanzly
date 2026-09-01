"use client";

/* ============================================================
   AutomationsLoopConfig - editor for LoopConfig (maxIterations,
   tokenBudget, autoExecute, approvalThreshold, cooldownMinutes,
   retryCount, retryBackoff). Strict monochrome Swiss design.
   ============================================================ */

import { FieldLabel } from "./_helpers";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LoopConfig } from "./_data";
import { RETRY_BACKOFFS } from "./automations-helpers";

export interface LoopConfigEditorProps {
  config: LoopConfig;
  onChange: (patch: Partial<LoopConfig>) => void;
  readOnly?: boolean;
}

export function AutomationsLoopConfig({ config, onChange, readOnly }: LoopConfigEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Iterations + token budget */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel required hint="cap">Max iterations</FieldLabel>
          <Input
            type="number"
            min={1}
            max={20}
            value={String(config.maxIterations)}
            onChange={(e) =>
              onChange({ maxIterations: clampNum(Number(e.target.value) || 1, 1, 20) })
            }
            disabled={readOnly}
            className="h-8 rounded-[5px] text-[12px] tabular"
          />
        </div>
        <div>
          <FieldLabel required hint="total">Token budget</FieldLabel>
          <Input
            type="number"
            min={0}
            step={500}
            value={String(config.tokenBudget)}
            onChange={(e) =>
              onChange({ tokenBudget: Math.max(0, Number(e.target.value) || 0) })
            }
            disabled={readOnly}
            className="h-8 rounded-[5px] text-[12px] tabular"
          />
        </div>
      </div>

      {/* Cooldown + retry */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel required hint="min">Cooldown (min)</FieldLabel>
          <Input
            type="number"
            min={0}
            value={String(config.cooldownMinutes)}
            onChange={(e) =>
              onChange({ cooldownMinutes: Math.max(0, Number(e.target.value) || 0) })
            }
            disabled={readOnly}
            className="h-8 rounded-[5px] text-[12px] tabular"
          />
        </div>
        <div>
          <FieldLabel required hint="retries">Retry count</FieldLabel>
          <Input
            type="number"
            min={0}
            max={5}
            value={String(config.retryCount)}
            onChange={(e) =>
              onChange({ retryCount: clampNum(Number(e.target.value) || 0, 0, 5) })
            }
            disabled={readOnly}
            className="h-8 rounded-[5px] text-[12px] tabular"
          />
        </div>
        <div>
          <FieldLabel required>Backoff</FieldLabel>
          <Select
            value={config.retryBackoff}
            onValueChange={(v) => onChange({ retryBackoff: v as LoopConfig["retryBackoff"] })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[5px]">
              {RETRY_BACKOFFS.map((b) => (
                <SelectItem key={b.value} value={b.value} className="text-[12px]">
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Auto-execute toggle */}
      <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card px-2.5 py-2">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-foreground">Auto-execute</span>
          <span className="text-[10px] text-muted-foreground">
            When off, action / integration steps with impact {">="} threshold pause for approval
          </span>
        </div>
        <Switch
          checked={config.autoExecute}
          onCheckedChange={(v) => onChange({ autoExecute: v })}
          disabled={readOnly}
        />
      </div>

      {/* Approval threshold slider */}
      <div className="flex flex-col gap-1.5 rounded-[5px] border border-border bg-card px-2.5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-foreground">Approval threshold</span>
            <span className="text-[10px] text-muted-foreground">
              Steps with impact {"="} or above this value pause for approval when auto-execute is off
            </span>
          </div>
          <span className="text-[14px] font-medium text-foreground tabular">{config.approvalThreshold}</span>
        </div>
        <Slider
          value={[config.approvalThreshold]}
          min={0}
          max={100}
          step={5}
          onValueChange={(v) => onChange({ approvalThreshold: v[0] ?? 60 })}
          disabled={readOnly}
          className="w-full"
        />
      </div>
    </div>
  );
}

function clampNum(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
