// Shared helpers for the scheduled-reports routes. Not a route file itself
// (no route.ts filename) so Next.js doesn't treat it as an endpoint.

export function toScheduledReportDTO(s: {
  id: string; reportId: string; reportName: string; category: string; frequency: string;
  deliveryTime: string; recipients: string; format: string; status: string;
  nextRun: Date | null; lastRun: Date | null; createdBy: string | null;
}) {
  let recipients: string[] = [];
  try { recipients = JSON.parse(s.recipients); } catch { /* ignore */ }
  return {
    id: s.id,
    reportId: s.reportId,
    reportName: s.reportName,
    category: s.category,
    frequency: s.frequency,
    deliveryTime: s.deliveryTime,
    recipients,
    format: s.format,
    status: s.status,
    nextRun: s.nextRun ? s.nextRun.toISOString() : undefined,
    lastRun: s.lastRun ? s.lastRun.toISOString() : undefined,
    createdBy: s.createdBy ?? "",
  };
}

export function computeNextRun(frequency: string, deliveryTime: string): Date {
  const [hh, mm] = deliveryTime.split(":").map(Number);
  const next = new Date();
  next.setHours(hh || 8, mm || 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  if (frequency === "Weekly") {
    while (next.getDay() !== 1) next.setDate(next.getDate() + 1); // next Monday
  } else if (frequency === "Monthly") {
    next.setMonth(next.getMonth() + (next.getDate() > 1 ? 1 : 0), 1);
  }
  return next;
}
