"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { KNOWLEDGE_ARTICLES } from "./_helpers";
import type { KnowledgeArticle } from "./_helpers";
import { ArticlesList } from "./articles-list";
import { ArticleDetail } from "./article-detail";
import { AddArticleDrawer } from "./add-article-drawer";

export function KnowledgeModule() {
  const { activeView, navigate } = useAppStore();
  const [articles, setArticles] = useState<KnowledgeArticle[]>(KNOWLEDGE_ARTICLES);

  const addArticle = useCallback((a: KnowledgeArticle) => {
    setArticles((prev) => [a, ...prev]);
  }, []);

  // Detail view
  if (
    activeView.module === "knowledge" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <ArticleDetail articleId={activeView.id} initialTab={activeView.tab} />;
  }

  // Drawer visibility
  const drawerOpen =
    activeView.module === "knowledge" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "knowledge" && activeView.view === "create") {
      navigate("knowledge");
    }
  };

  return (
    <>
      <ArticlesList articles={articles} onCreate={() => navigate("knowledge", "create")} />
      <AddArticleDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addArticle} />
    </>
  );
}
