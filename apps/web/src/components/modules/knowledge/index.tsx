"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
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

export function KnowledgeModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "knowledge");

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

  if (view.view === "detail" && view.id) {
    return <ArticleDetail articleId={view.id} initialTab={view.tab} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      navigateCompat("knowledge");
    }
  };

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading knowledge base…</div>;
  }

  return (
    <>
      <ArticlesList articles={articles} onCreate={() => navigateCompat("knowledge", "create")} />
      <AddArticleDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addArticle} />
    </>
  );
}
