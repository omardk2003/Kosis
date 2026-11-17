"use client";

/**
 * Last-resort boundary when the root layout itself fails. The layout (and its translated strings)
 * is unavailable here, so this one screen uses fixed bilingual text — a documented AC-X6 exception.
 * Text mirrors content/messages/{en,da}.json → error.*.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 400 }}>
        <h1 style={{ fontSize: 24 }}>This page didn&apos;t load</h1>
        <p lang="da">Siden blev ikke indlæst</p>
        <button type="button" onClick={() => reset()} style={{ minHeight: 44, padding: "0 16px" }}>
          Try again · Prøv igen
        </button>
      </body>
    </html>
  );
}
