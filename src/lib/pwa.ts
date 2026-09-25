const APP_SW_PATH = "/sw.js";
function blocked() {
  const host = window.location.hostname;
  return !import.meta.env.PROD || window.self !== window.top || host.startsWith("id-preview--") || host.startsWith("preview--") || host === "lovableproject.com" || host.endsWith(".lovableproject.com") || host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") || host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev") || new URLSearchParams(window.location.search).get("sw") === "off";
}
async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter(registration => registration.active?.scriptURL.endsWith(APP_SW_PATH) || registration.installing?.scriptURL.endsWith(APP_SW_PATH) || registration.waiting?.scriptURL.endsWith(APP_SW_PATH)).map(registration => registration.unregister()));
}
export async function registerAsset360ServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (blocked()) { await unregisterAppWorkers(); return; }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true, onOfflineReady: () => window.dispatchEvent(new CustomEvent("asset360-offline-ready")) });
}
