"use client";

import { useEffect } from "react";

/** Registers the shell-only service worker in production builds (ADR-0008). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failure only disables the offline shell; the app keeps working.
    });
  }, []);
  return null;
}
