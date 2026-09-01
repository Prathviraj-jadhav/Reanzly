"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toastSuccess, toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Plus,
  Trash2,
  GripVertical,
  FileQuestion,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  QUESTION_TYPES,
  questionTypeMeta,
  FieldLabel,
  type Survey,
  type SurveyQuestion,
  type QuestionType,
} from "./_helpers";

interface SurveyBuilderProps {
  open: boolean;
  survey: Survey | null;
  onClose: () => void;
  onSave: (surveyId: string, questions: SurveyQuestion[]) => void;
}

export function SurveyBuilder({ open, survey, onClose, onSave }: SurveyBuilderProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open && survey) {
      setQuestions(survey.questions.map((q) => ({ ...q })));
      setTitle(survey.title);
    }
  }, [open, survey]);

  const addQuestion = (type: QuestionType) => {
    const newQ: SurveyQuestion = {
      id: `q-new-${Date.now()}`,
      type,
      text: "",
      required: false,
      options: type === "Multiple Choice" ? ["Option 1", "Option 2"] : undefined,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestion = (id: string, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const moveQuestion = (id: string, dir: "up" | "down") => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[newIdx];
      next[newIdx] = tmp;
      return next;
    });
  };

  const handleSave = () => {
    if (!survey) return;
    const emptyText = questions.find((q) => !q.text.trim());
    if (emptyText) {
      toastInfo("Question text required", "Every question needs text before saving.");
      return;
    }
    if (questions.length === 0) {
      toastInfo("No questions", "Add at least one question before saving.");
      return;
    }
    onSave(survey.id, questions);
    toastSuccess("Survey saved", `${survey.surveyId} · ${questions.length} questions updated.`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Survey Builder
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {survey?.title ?? "New survey"} · {questions.length} question{questions.length === 1 ? "" : "s"}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Survey title preview */}
          <div className="mb-4 rounded-[6px] border border-border bg-card p-4">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Survey title</Label>
            <div className="mt-1 text-[15px] font-medium text-foreground">{title}</div>
          </div>

          {/* Add question toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Add question:</span>
            {QUESTION_TYPES.map((t) => {
              const meta = questionTypeMeta(t);
              return (
                <button
                  key={t}
                  onClick={() => addQuestion(t)}
                  className="tap flex h-7 items-center gap-1.5 rounded-[5px] border border-border px-2 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  {meta.short}
                </button>
              );
            })}
          </div>

          {/* Question list */}
          <div className="flex flex-col gap-3">
            {questions.length === 0 && (
              <div className="rounded-[6px] border border-dashed border-border bg-background px-4 py-12 text-center text-[13px] text-muted-foreground">
                <FileQuestion className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                No questions yet. Add one from the toolbar above.
              </div>
            )}
            {questions.map((q, idx) => {
              const meta = questionTypeMeta(q.type);
              return (
                <div key={q.id} className="rounded-[6px] border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="tabular flex h-6 w-6 items-center justify-center rounded-[5px] border border-border bg-muted text-[11px] font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <StatusBadge variant="muted">{meta.short}</StatusBadge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveQuestion(q.id, "up")}
                        disabled={idx === 0}
                        className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveQuestion(q.id, "down")}
                        disabled={idx === questions.length - 1}
                        className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <FieldLabel required>Question text</FieldLabel>
                  <Input
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    placeholder="e.g. How would you rate your overall experience?"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3 text-muted-foreground" />
                      <Label className="text-[11px] text-muted-foreground">Type:</Label>
                      <Select
                        value={q.type}
                        onValueChange={(v) => {
                          const newType = v as QuestionType;
                          updateQuestion(q.id, {
                            type: newType,
                            options: newType === "Multiple Choice" ? (q.options ?? ["Option 1", "Option 2"]) : undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 w-[160px] rounded-[5px] text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{questionTypeMeta(t).label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.required}
                        onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                      />
                      <Label className="text-[12px] text-foreground">Required</Label>
                    </div>
                  </div>
                  {q.type === "Multiple Choice" && (
                    <div className="mt-3 rounded-[5px] border border-border bg-background p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Options</Label>
                        <button
                          onClick={() => updateQuestion(q.id, { options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })}
                          className="tap flex h-6 items-center gap-1 rounded-[3px] px-1.5 text-[11px] font-medium text-foreground hover:bg-accent"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {q.options?.map((opt, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const next = [...(q.options ?? [])];
                                next[i] = e.target.value;
                                updateQuestion(q.id, { options: next });
                              }}
                              className="h-7 rounded-[4px] text-[12px]"
                            />
                            <button
                              onClick={() => {
                                const next = (q.options ?? []).filter((_, j) => j !== i);
                                updateQuestion(q.id, { options: next });
                              }}
                              className="tap flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                              aria-label="Remove option"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular">
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </span>
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
              Save Survey
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
