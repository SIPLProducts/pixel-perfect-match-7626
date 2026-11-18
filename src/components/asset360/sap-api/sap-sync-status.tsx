import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSapSyncStatus } from "@/lib/sap-api.functions";

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const formatTime = (value: string) => dateTime.format(new Date(value));

/** Compact administrator-only status beside the existing Sync SAP action. */
export function SapSyncStatus() {
  const load = useServerFn(getSapSyncStatus);
  const query = useQuery({ queryKey: ["sap-sync-status"], queryFn: () => load(), refetchInterval: 30_000, refetchOnWindowFocus: "always" });
  if (query.isLoading) return <Badge variant="outline" className="h-9 gap-2 px-3"><LoaderCircle className="size-3.5 animate-spin" />Auto-sync</Badge>;
  if (query.error || !query.data) return <Badge variant="outline" className="h-9 gap-2 border-destructive/30 bg-destructive/10 px-3 text-destructive"><AlertCircle className="size-3.5" />Sync status unavailable</Badge>;

  const { configured, latest, nextAutomaticAt } = query.data;
  const running = latest?.status === "running";
  const failed = latest?.status === "failed";
  const title = failed ? latest.error_message ?? "The last SAP sync failed" : "Automatic sync includes every plant in this SAP-configured workspace";
  const lastText = running
    ? `${latest.processed_records.toLocaleString()} of ${latest.total_records.toLocaleString()} processed`
    : latest
      ? `${latest.status === "completed" ? "Completed" : latest.status === "cancelled" ? "Stopped" : "Failed"} ${formatTime(latest.started_at)} · ${latest.inserted_count} added, ${latest.updated_count} updated`
      : "No sync has run yet";

  return <div className="flex min-h-9 items-center gap-2 rounded-lg border border-glass-border bg-card/50 px-3 py-1.5 text-xs" title={title} aria-live="polite">
    {running ? <LoaderCircle className="size-4 shrink-0 animate-spin text-warning" /> : failed ? <AlertCircle className="size-4 shrink-0 text-destructive" /> : configured ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Clock3 className="size-4 shrink-0 text-muted-foreground" />}
    <div>
      <p className="font-medium">{configured ? "Auto-sync every 6 hrs · All plants" : "Auto-sync needs SAP setup"}</p>
      <p className="text-[10px] text-muted-foreground">{lastText} · Next {formatTime(nextAutomaticAt)}</p>
    </div>
  </div>;
}
