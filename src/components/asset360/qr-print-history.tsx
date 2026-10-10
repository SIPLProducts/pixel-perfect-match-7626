import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { qrPrintHistory } from "@/lib/qr-print-history";

type HistoryEntry = ReturnType<typeof qrPrintHistory>[number];
const requestedAt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
});
const actionLabels: Record<string, string> = { print: "Print requested", pdf: "PDF download", png: "PNG download" };

export function QrPrintHistory({ entries }: { entries: HistoryEntry[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(entries.length / 10));
  const current = Math.min(page, pages - 1);
  return <section aria-label="QR print history" className="border-t border-glass-border pt-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-display font-bold">QR print history</h3>
      <span className="text-xs tabular-nums text-muted-foreground">{entries.length} requests</span>
    </div>
    {entries.length === 0 ? <p className="text-sm text-muted-foreground">No QR print or download requests recorded.</p> : <>
      <ol className="divide-y divide-glass-border">
        {entries.slice(current * 10, current * 10 + 10).map(entry => <li key={entry.id} className="flex gap-3 py-3">
          {entry.action === "print" ? <Printer className="mt-0.5 size-4 shrink-0 text-primary"/> : <Download className="mt-0.5 size-4 shrink-0 text-primary"/>}
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-semibold">{actionLabels[entry.action] ?? entry.action}</p>
            <time dateTime={entry.created_at} className="block text-xs text-muted-foreground">{requestedAt.format(new Date(entry.created_at))}</time>
            <p className="break-words"><span className="text-muted-foreground">Requested by </span>{entry.user_name ?? `User ${entry.created_by}`}</p>
          </div>
        </li>)}
      </ol>
      {pages > 1 && <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Page {current + 1} of {pages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" aria-label="Previous history page" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft/></Button>
          <Button variant="outline" size="icon" aria-label="Next history page" disabled={current === pages - 1} onClick={() => setPage(current + 1)}><ChevronRight/></Button>
        </div>
      </div>}
    </>}
  </section>;
}