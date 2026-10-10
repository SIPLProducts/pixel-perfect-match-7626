export type QrPrintRecord = {
  id: string;
  asset_id: string;
  action: string;
  created_at: string;
  created_by: string;
};

export function qrPrintHistory(
  records: QrPrintRecord[],
  profiles: { id: string; full_name: string }[],
) {
  const names = new Map(profiles.map(profile => [profile.id, profile.full_name]));
  return records.map(record => ({
    ...record,
    user_name: names.get(record.created_by)?.trim() || null,
  })).sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}