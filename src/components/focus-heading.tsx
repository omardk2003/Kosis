"use client";

import { useEffect } from "react";

/** Moves focus to the page heading after navigation (WCAG 2.4.3; docs/screens/today-placeholder.md). */
export function FocusHeading({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus();
  }, [targetId]);
  return null;
}
