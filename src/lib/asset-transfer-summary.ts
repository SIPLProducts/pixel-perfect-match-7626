type TransferRecord = { id: string; asset_id: string; created_at: string };

export function latestAssetTransfers<T extends TransferRecord>(transfers: readonly T[]) {
  const latest = new Map<string, T>();
  for (const transfer of transfers) {
    const previous = latest.get(transfer.asset_id);
    if (!previous || transfer.created_at > previous.created_at ||
      (transfer.created_at === previous.created_at && transfer.id > previous.id)) {
      latest.set(transfer.asset_id, transfer);
    }
  }
  return latest;
}