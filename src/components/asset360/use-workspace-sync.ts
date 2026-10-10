import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { workspaceSubscriptions } from "@/lib/workspace-sync";

export function useWorkspaceSync(organizationId: string | undefined, userId: string) {
  const client = useQueryClient();
  const [status, setStatus] = useState("Connecting");

  useEffect(() => {
    if (!organizationId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshing = false;
    let dirty = false;
    const refresh = async () => {
      if (disposed || !navigator.onLine) return;
      dirty = true;
      if (refreshing) return;
      refreshing = true;
      try {
        while (dirty && !disposed) {
          dirty = false;
          await client.invalidateQueries({ queryKey: ["workspace", userId] }, { cancelRefetch: false });
        }
      } finally { refreshing = false; }
    };
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = undefined; void refresh(); }, 300);
    };
    const channel = supabase.channel(`workspace:${organizationId}:${userId}`);
    for (const { table, filter } of workspaceSubscriptions(organizationId, userId)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter }, schedule);
    }
    channel.subscribe(state => {
      if (disposed) return;
      setStatus(!navigator.onLine ? "Offline" : state === "SUBSCRIBED" ? "Live updates" : "Reconnecting");
      if (state === "SUBSCRIBED") schedule();
    });
    const online = () => { setStatus("Reconnecting"); schedule(); };
    const offline = () => setStatus("Offline");
    const visible = () => { if (document.visibilityState === "visible") schedule(); };
    if (!navigator.onLine) offline();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
      void supabase.removeChannel(channel);
    };
  }, [client, organizationId, userId]);
  return status;
}