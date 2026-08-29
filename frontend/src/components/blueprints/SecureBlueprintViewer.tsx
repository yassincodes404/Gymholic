"use client";

import { useEffect, useState } from "react";
import { fetchStorePdfBlob } from "@/lib/store";

/*!
 * Secure Blueprint viewer — streams the PDF with the signed-in user's
 * bearer token into a blob object URL rendered inside an iframe. The URL is
 * revoked on unmount and no download button is offered (best-effort
 * protection; screenshots can't be prevented).
 */
export function SecureBlueprintViewer({ slug, token }: { slug: string; token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setError(null);
    setUrl(null);
    fetchStorePdfBlob(slug, token)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not open this blueprint.");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [slug, token]);

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-sm"
        style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.25)" }}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!url) {
    return <p className="text-sm opacity-50">Opening the secure viewer…</p>;
  }

  return (
    <div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
      >
        <iframe
          src={url}
          title="Blueprint viewer"
          className="w-full"
          style={{ height: "80vh", border: "none", background: "#fff" }}
        />
      </div>
      <p className="text-xs opacity-50 mt-3">
        Viewing is only available on Gymholic — this document can&apos;t be downloaded or shared from here.
      </p>
    </div>
  );
}
