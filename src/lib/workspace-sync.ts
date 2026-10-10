export const WORKSPACE_FALLBACK_MS = 60_000;

export function workspaceSubscriptions(organizationId: string, userId: string) {
  const tables = ["asset_qr_prints", "asset_attachments", "assets", "asset_qr_codes", "asset_categories", "locations", "departments", "employees", "asset_transfers", "maintenance_requests", "asset_verifications", "asset_assignments", "asset_events", "integrations", "notifications", "verification_campaigns"];
  return [
    ...tables.map(table => ({ table, filter: `organization_id=eq.${organizationId}` })),
    { table: "organizations", filter: `id=eq.${organizationId}` },
    { table: "profiles", filter: `id=eq.${userId}` },
    { table: "user_roles", filter: `user_id=eq.${userId}` },
  ];
}