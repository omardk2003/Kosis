"use client";

import { useOnline } from "./use-online";

/** Shown only while offline. The text is translated on the server and passed in. */
export function OfflineBanner({ text }: { text: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <p
      role="status"
      className="rounded-[var(--radius-card)] border border-border-strong bg-surface px-4 py-3"
    >
      {text}
    </p>
  );
}
