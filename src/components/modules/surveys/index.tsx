"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { SurveysList } from "./surveys-list";
import { SurveyDetail } from "./survey-detail";
import { SurveyBuilder } from "./survey-builder";
import { SURVEYS, type Survey, type SurveyQuestion } from "./_helpers";
import { toastInfo } from "@/lib/toast";

export function SurveysModule() {
  const { activeView, navigate } = useAppStore();
  const [surveys, setSurveys] = useState<Survey[]>(SURVEYS);
  const [buildingSurvey, setBuildingSurvey] = useState<Survey | null>(null);

  const updateSurveyQuestions = useCallback((surveyId: string, questions: SurveyQuestion[]) => {
    setSurveys((prev) => prev.map((s) => (s.id === surveyId ? { ...s, questions } : s)));
  }, []);

  // Detail view
  if (activeView.module === "surveys" && activeView.view === "detail" && activeView.id) {
    return (
      <SurveyDetail
        surveyId={activeView.id}
        surveys={surveys}
        onBuild={(s) => {
          setBuildingSurvey(s);
        }}
      />
    );
  }

  // Builder drawer visibility
  const builderOpen = !!buildingSurvey;
  const closeBuilder = () => setBuildingSurvey(null);

  return (
    <>
      <SurveysList
        surveys={surveys}
        onCreate={() => {
          toastInfo("New survey", "Opening the survey builder for a draft survey.");
          const draft: Survey = {
            id: `srv-${Date.now()}`,
            surveyId: `SVY-${String(1490 + surveys.length).padStart(4, "0")}`,
            title: "Untitled Survey",
            description: "Add a short description of what this survey measures.",
            status: "Draft",
            audience: "Customer",
            responses: 0,
            created: new Date().toISOString(),
            owner: "Rohan Mehta",
            questions: [],
            responseList: [],
          };
          setBuildingSurvey(draft);
        }}
        onBuild={(s) => setBuildingSurvey(s)}
      />
      <SurveyBuilder
        open={builderOpen}
        survey={buildingSurvey}
        onClose={closeBuilder}
        onSave={(surveyId, questions) => {
          updateSurveyQuestions(surveyId, questions);
          // Ensure the survey list reflects the saved state
          setSurveys((prev) =>
            prev.map((s) =>
              s.id === surveyId
                ? { ...s, questions, title: buildingSurvey?.title ?? s.title }
                : s,
            ),
          );
          // If the survey was new (not yet in the list), add it
          setSurveys((prev) => {
            if (prev.some((s) => s.id === surveyId)) return prev;
            return [buildingSurvey!, ...prev];
          });
          navigate("surveys");
        }}
      />
    </>
  );
}
