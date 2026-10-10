import { queryOptions } from "@tanstack/react-query";
import { getWorkspaceData } from "@/lib/asset360.functions";
import { WORKSPACE_FALLBACK_MS } from "./workspace-sync";

export const workspaceQueryOptions = (userId: string) => queryOptions({
  queryKey: ["workspace", userId],
  queryFn: () => getWorkspaceData(),
  staleTime: 10_000,
  refetchInterval: WORKSPACE_FALLBACK_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
  retry: 1,
});