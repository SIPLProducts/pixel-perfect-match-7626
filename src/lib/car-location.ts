export type CarLocation = { latitude: number; longitude: number };
export function carLocationUrl(location: CarLocation) {
  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Location is unavailable");
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
export function carMessageWithLocation(details: string, location: CarLocation | null) {
  return [details.trim(), location ? `Location: ${carLocationUrl(location)}` : ""].filter(Boolean).join("\n");
}
export function carMessageMapUrl(message: string) {
  const match = message.match(/Location: (https:\/\/www\.google\.com\/maps\?q=(-?\d+\.\d+),(-?\d+\.\d+))(?:\s|$)/);
  if (!match) return null;
  try { return carLocationUrl({ latitude: Number(match[2]), longitude: Number(match[3]) }); } catch { return null; }
}