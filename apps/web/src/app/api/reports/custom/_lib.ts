export function toCustomReportDTO(c: {
  id: string; name: string; baseReportId: string; category: string; description: string | null;
  filters: string | null; createdBy: string | null; createdAt: Date; lastRun: Date | null; runCount: number;
}) {
  let filters: Record<string, unknown> = {};
  try { filters = c.filters ? JSON.parse(c.filters) : {}; } catch { /* ignore */ }
  return {
    id: c.id,
    name: c.name,
    baseReportId: c.baseReportId,
    category: c.category,
    description: c.description ?? "",
    filters,
    createdBy: c.createdBy ?? "",
    createdAt: c.createdAt.toISOString(),
    lastRun: c.lastRun ? c.lastRun.toISOString() : undefined,
    runCount: c.runCount,
  };
}
