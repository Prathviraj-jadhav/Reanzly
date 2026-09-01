"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { KnowledgeArticle } from "./_helpers";
import { ArticlesList } from "./articles-list";
import { ArticleDetail } from "./article-detail";
import { AddArticleDrawer } from "./add-article-drawer";
import { toast } from "sonner";
import {
  fetchKnowledgeArticles,
  createKnowledgeArticle,
  pilotErrorMessage,
} from "@/lib/pilot-api";

export function KnowledgeModule() {
  const { activeView, navigate } = useAppStore();

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchKnowledgeArticles()
      .then(setArticles)
      .catch(() => toast.error("Couldn't load knowledge base", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addArticle = useCallback(async (a: KnowledgeArticle): Promise<boolean> => {
    const { id: _clientId, related: _related, ...payload } = a;
    try {
      const article = await createKnowledgeArticle(payload);
      setArticles((prev) => [article, ...prev]);
      return true;
    } catch (error) {
      toast.error("Couldn't create article", {
        description: pilotErrorMessage(error, "Try again."),
      });
      return false;
    }
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

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading knowledge base…</div>;
  }

  return (
    <>
      <ArticlesList articles={articles} onCreate={() => navigate("knowledge", "create")} />
      <AddArticleDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addArticle} />
    </>
  );
}
