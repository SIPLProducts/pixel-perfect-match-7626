import { queryOptions } from "@tanstack/react-query";
import { getWorkspaceAssets, getWorkspaceData, type WorkspacePayload } from "@/lib/asset360.functions";
import { WORKSPACE_FALLBACK_MS } from "./workspace-sync";

type WorkspaceAssets = Extract<WorkspacePayload, { needsOnboarding: false }>["assets"];

export const workspaceQueryOptions = (userId: string) => queryOptions({
  queryKey: ["workspace", userId],
  queryFn: async (): Promise<WorkspacePayload> => {
    const response = (await getWorkspaceData()) as unknown as Response;
    if (!response.ok) throw new Error("Workspace could not be loaded");
    return response.json();
  },
  staleTime: 10_000,
  refetchInterval: WORKSPACE_FALLBACK_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
  retry: 1,
});

// Loaded after the workspace opens so the Dashboard never waits for the full register.
export const workspaceAssetsQueryOptions = (userId: string) => queryOptions({
  queryKey: ["workspace", userId, "assets"],
  queryFn: async (): Promise<WorkspaceAssets> => {
    const response = (await getWorkspaceAssets()) as unknown as Response;
    if (!response.ok) throw new Error("Assets could not be loaded");
    return (await response.json()).assets;
  },
  staleTime: 60_000,
  refetchInterval: WORKSPACE_FALLBACK_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: false,
  retry: 1,
});
