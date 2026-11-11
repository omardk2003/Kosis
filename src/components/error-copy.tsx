"use client";

import { createContext, useContext } from "react";

export type ErrorCopy = { title: string; body: string; retry: string; home: string };

const ErrorCopyContext = createContext<ErrorCopy | null>(null);

/** Server-translated error strings for app/error.tsx (no next-intl client runtime; ADR-0009). */
export function ErrorCopyProvider({
  copy,
  children,
}: {
  copy: ErrorCopy;
  children: React.ReactNode;
}) {
  return <ErrorCopyContext.Provider value={copy}>{children}</ErrorCopyContext.Provider>;
}

export function useErrorCopy(): ErrorCopy | null {
  return useContext(ErrorCopyContext);
}
