"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { KnowledgeArticle } from "./_helpers";
import { ArticlesList } from "./articles-list";
import { ArticleDetail } from "./article-detail";
import { AddArticleDrawer } from "./add-article-drawer";
import { toast } from "sonner";

export function KnowledgeModule() {
  const { activeView, navigate } = useAppStore();

  // Real, database-backed articles (src/app/api/knowledge) - previously
  // useState(KNOWLEDGE_ARTICLES) seeded from a client-only mock array.
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ articles }) => setArticles(articles))
      .catch(() => toast.error("Couldn't load knowledge base", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addArticle = useCallback(async (a: KnowledgeArticle): Promise<boolean> => {
    const { id: _clientId, related: _related, ...payload } = a;
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create article", { description: body.error || "Try again." });
      return false;
    }
    const { article } = await res.json();
    setArticles((prev) => [article, ...prev]);
    return true;
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
