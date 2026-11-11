/** Deletes every Cache Storage entry after sign-out or account deletion (ADR-0008, SR-H3). */
export async function purgeAppCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  const registration = await navigator.serviceWorker?.getRegistration();
  await registration?.update();
}
