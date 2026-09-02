"use client";

import Link from "next/link";
import { useEffect } from "react";

/*!
  Gymholic error boundary — catches render/data failures per route segment
  and offers a retry instead of Next's default crash screen.
*/
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 section-dark">
      <p className="text-xs uppercase tracking-[0.35em] mb-5" style={{ color: "var(--orange)" }}>
        Something went wrong
      </p>
      <h1 className="display-hero text-4xl md:text-6xl max-w-2xl mb-5">
        Something snapped.
      </h1>
      <p className="opacity-60 max-w-md mb-10">
        An unexpected error interrupted this page. Try again — if it keeps
        happening, we&apos;ve been notified and are on it.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <button type="button" onClick={reset} className="btn-pill">
          Try again
        </button>
        <Link href="/" className="btn-pill btn-pill--ghost">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
