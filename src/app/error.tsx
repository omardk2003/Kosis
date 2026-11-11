
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useErrorCopy } from "@/components/error-copy";

/** Route error boundary: calm message, retry, and a way back. Never shows technical details. */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = useErrorCopy();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  if (!copy) return null;
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[var(--form-max)] flex-col gap-4 px-4 py-8"
    >
      <h1 ref={heading} tabIndex={-1} className="font-display text-xl font-semibold">
        {copy.title}
      </h1>
      <p className="text-text-muted">{copy.body}</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        {copy.retry}
      </button>
      <Link href="/" className="btn btn-text self-start px-0">
        {copy.home}
      </Link>
    </main>
  );
}
