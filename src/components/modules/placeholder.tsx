"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Construction } from "lucide-react";

export function PlaceholderModule({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title.charAt(0).toUpperCase() + title.slice(1)} description={description ?? "This module is being assembled."} />
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
          <Construction className="h-5 w-5" />
        </div>
        <h3 className="text-[15px] font-medium">Under construction</h3>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          This module&apos;s scaffolding is in place. The full feature set is being welded in.
        </p>
      </div>
    </div>
  );
}
