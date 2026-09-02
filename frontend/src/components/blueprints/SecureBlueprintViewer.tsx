"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { fetchStorePdfBlob } from "@/lib/store";
import {
  IconClose,
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconExpand,
  IconFitWidth,
  IconGrid,
  IconLock,
} from "@/components/account/icons";

/*!
 * Secure Blueprint viewer — a premium full-screen overlay that streams the
 * PDF with the signed-in user's bearer token into a blob object URL (never
 * a downloadable link), then renders it with pdf.js on canvas.
 *
 * Utilities: page navigation (buttons, jump box, ←/→ keys), zoom (buttons,
 * +/- keys, fit-width), rotation, a thumbnail rail, and fullscreen — the
 * tools a real reader needs, without a download or print button anywhere.
 * The blob URL is revoked on unmount and the context menu is suppressed
 * (best-effort protection; screenshots can't be prevented).
 */

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 1.2;

type ViewerToolProps = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  active?: boolean;
};

function Tool({ onClick, label, disabled, children, active }: ViewerToolProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="booking-tile w-9 h-9 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-25"
      style={{
        background: active ? "rgba(255,106,0,0.16)" : "rgba(245,241,232,0.06)",
        color: active ? "var(--orange)" : "var(--paper)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function SecureBlueprintViewer({
  slug,
  token,
  title,
  onClose,
}: {
  slug: string;
  token: string;
  title: string;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderJobRef = useRef<{ cancelled: boolean } | null>(null);
  const thumbCanvasesRef = useRef<Map<number, string>>(new Map());
  // Render reads from this state copy — refs aren't reactive, so the rail
  // re-renders off the state update, not off ref mutation.
  const [thumbs, setThumbs] = useState<Map<number, string>>(new Map());

  // Fetch the encrypted-document blob and open it with pdf.js (dynamic
  // import keeps the ~400KB renderer out of the main bundle and SSR).
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setError(null);
    setDoc(null);
    setLoadPct(0);
    (async () => {
      try {
        const blob = await fetchStorePdfBlob(slug, token);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url: objectUrl });
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (!cancelled && total > 0) setLoadPct(Math.min(100, Math.round((loaded / total) * 100)));
        };
        const loaded = await task.promise;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setDoc(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not open this blueprint.");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [slug, token]);

  // Esc closes (and leaves fullscreen first); arrows flip pages; +/- zoom.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => undefined);
        } else {
          onClose();
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => p + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(1, p - 1));
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(MAX_SCALE, s * SCALE_STEP));
      if (e.key === "-") setScale((s) => Math.max(MIN_SCALE, s / SCALE_STEP));
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Fullscreen state tracking (the user can also leave via F11/Esc).
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /** Fit-width: the page spans the stage between the rail and the padding. */
  const computeFitScale = useCallback(async (document_: PDFDocumentProxy) => {
    if (!stageRef.current) return 1;
    const pdfPage = await document_.getPage(Math.min(page, document_.numPages));
    const base = pdfPage.getViewport({ scale: 1, rotation });
    const available = stageRef.current.clientWidth - (thumbsOpen ? 184 : 0) - 48;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, available / base.width));
  }, [page, rotation, thumbsOpen]);

  // (Re)render the current page whenever the document, page, zoom or
  // rotation changes — or on window resize while in fit-width mode.
  useEffect(() => {
    if (!doc) return;
    const clamped = Math.min(Math.max(1, page), doc.numPages);
    if (clamped !== page) {
      setPage(clamped);
      return;
    }

    let cancelled = false;
    if (renderJobRef.current) renderJobRef.current.cancelled = true;
    const job = { cancelled: false };
    renderJobRef.current = job;

    (async () => {
      try {
        const pdfPage = await doc.getPage(clamped);
        if (cancelled || job.cancelled) return;
        const targetScale = fitWidth ? await computeFitScale(doc) : scale;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pdfPage.getViewport({ scale: targetScale * dpr, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const context = canvas.getContext("2d");
        if (!context) return;
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        if (cancelled || job.cancelled) return;
        if (fitWidth) setScale(Math.round(targetScale * 100) / 100);
      } catch {
        // Render aborted by a newer interaction — ignore.
      }
    })();

    return () => {
      cancelled = true;
      job.cancelled = true;
    };
  }, [doc, page, scale, fitWidth, rotation, resizeTick, computeFitScale]);

  // Track window resizes so fit-width re-renders at the right size.
  useEffect(() => {
    function onResize() {
      setResizeTick((t) => t + 1);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Page counter syncs the jump box.
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  /** Renders thumbnails (once per document) at ~130px wide. */
  useEffect(() => {
    if (!doc || !thumbsOpen) return;
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      for (let i = 1; i <= Math.min(doc.numPages, 200); i++) {
        if (cancelled) return;
        if (thumbCanvasesRef.current.has(i)) continue;
        try {
          const pdfPage = await doc.getPage(i);
          const base = pdfPage.getViewport({ scale: 1 });
          const viewport = pdfPage.getViewport({ scale: 130 / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) return;
          await pdfPage.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;
          thumbCanvasesRef.current.set(i, canvas.toDataURL("image/jpeg", 0.7));
          setThumbs(new Map(thumbCanvasesRef.current));
        } catch {
          // A single failed thumbnail never breaks the rail.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, thumbsOpen]);

  function goToPage(raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && doc) setPage(Math.min(Math.max(1, n), doc.numPages));
    else setPageInput(String(page));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (stageRef.current) {
      void stageRef.current.requestFullscreen().catch(() => undefined);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} viewer`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="viewer-overlay flex flex-col h-full w-full px-3 pb-3 sm:px-5 sm:pb-5">
        {/* Top bar */}
        <div
          className="flex items-center gap-4 rounded-t-2xl px-4 sm:px-6 h-16 shrink-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid rgba(245,241,232,0.12)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-0.5" style={{ color: "var(--orange)" }}>
              Gymholic Secure Viewer
            </p>
            <h2 className="display-text text-base sm:text-lg truncate">{title}</h2>
          </div>
          <span
            className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0"
            style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
          >
            <IconLock width={13} height={13} /> Licensed to you
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "1px solid rgba(245,241,232,0.18)" }}
          >
            <IconClose width={16} height={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 shrink-0 flex-wrap"
          style={{ background: "var(--surface)", borderBottom: "1px solid rgba(245,241,232,0.08)" }}
        >
          <Tool onClick={() => setThumbsOpen((o) => !o)} label="Page thumbnails" active={thumbsOpen}>
            <IconGrid width={17} height={17} />
          </Tool>
          <span className="w-px h-6 mx-1 shrink-0" style={{ background: "rgba(245,241,232,0.12)" }} aria-hidden />
          <Tool onClick={() => setPage((p) => Math.max(1, p - 1))} label="Previous page" disabled={!doc || page <= 1}>
            <IconChevronLeft width={17} height={17} />
          </Tool>
          <form
            className="flex items-center gap-1 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              goToPage(pageInput);
            }}
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => goToPage(pageInput)}
              aria-label="Go to page"
              className="w-12 text-center text-sm rounded-lg px-1.5 py-1.5 outline-none focus:ring-1"
              style={{ background: "rgba(245,241,232,0.06)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.14)" }}
            />
            <span className="text-xs opacity-50 whitespace-nowrap">/ {doc?.numPages ?? "…"}</span>
          </form>
          <Tool onClick={() => setPage((p) => p + 1)} label="Next page" disabled={!doc || page >= (doc?.numPages ?? 1)}>
            <IconChevronRight width={17} height={17} />
          </Tool>
          <span className="w-px h-6 mx-1 shrink-0" style={{ background: "rgba(245,241,232,0.12)" }} aria-hidden />
          <Tool onClick={() => { setFitWidth(false); setScale((s) => Math.max(MIN_SCALE, s / SCALE_STEP)); }} label="Zoom out" disabled={!doc || scale <= MIN_SCALE}>
            <IconZoomOut width={17} height={17} />
          </Tool>
          <span className="text-xs w-12 text-center opacity-70 shrink-0 tabular-nums">{Math.round(scale * 100)}%</span>
          <Tool onClick={() => { setFitWidth(false); setScale((s) => Math.min(MAX_SCALE, s * SCALE_STEP)); }} label="Zoom in" disabled={!doc || scale >= MAX_SCALE}>
            <IconZoomIn width={17} height={17} />
          </Tool>
          <Tool
            onClick={async () => { setFitWidth(true); }}
            label="Fit width"
            active={fitWidth}
          >
            <IconFitWidth width={17} height={17} />
          </Tool>
          <Tool onClick={() => setRotation((r) => (r + 90) % 360)} label="Rotate 90°">
            <IconRotate width={17} height={17} />
          </Tool>
          <span className="w-px h-6 mx-1 shrink-0" style={{ background: "rgba(245,241,232,0.12)" }} aria-hidden />
          <Tool onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} active={isFullscreen}>
            <IconExpand width={17} height={17} />
          </Tool>
        </div>

        {/* Document stage */}
        <div
          ref={stageRef}
          className="flex-1 min-h-0 rounded-b-2xl overflow-hidden relative flex"
          style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.12)", borderTop: "none" }}
        >
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm" style={{ color: "var(--orange)" }} role="alert">
                {error}
              </p>
              <button type="button" onClick={onClose} className="btn-pill btn-pill--ghost">
                Back to the Blueprint
              </button>
            </div>
          ) : doc ? (
            <>
              {/* Thumbnail rail */}
              {thumbsOpen && (
                <div
                  className="h-full overflow-y-auto shrink-0 p-3 space-y-3 booking-rise"
                  style={{ width: 184, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(245,241,232,0.08)" }}
                  aria-label="Page thumbnails"
                >
                  {Array.from({ length: doc.numPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className="block w-full rounded-lg overflow-hidden transition-transform hover:scale-[1.03]"
                      style={{
                        border: n === page ? "2px solid var(--orange)" : "2px solid transparent",
                        opacity: thumbs.has(n) ? 1 : 0.35,
                      }}
                      aria-label={`Go to page ${n}`}
                    >
                      {thumbs.has(n) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs.get(n)} alt="" className="w-full" />
                      ) : (
                        <div className="w-full flex items-center justify-center text-xs opacity-50 py-8" style={{ background: "rgba(245,241,232,0.04)" }}>
                          {n}
                        </div>
                      )}
                      <span className="block text-center text-[10px] opacity-60 py-1" style={{ background: "rgba(245,241,232,0.04)" }}>
                        {n}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Page canvas */}
              <div className="flex-1 min-w-0 overflow-auto flex items-start justify-center p-6" style={{ background: "rgba(0,0,0,0.22)" }}>
                <canvas
                  key={`${page}-${rotation}`}
                  ref={canvasRef}
                  className="max-w-full rounded-md"
                  style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.45)", background: "#fff" }}
                  aria-label={`Page ${page} of the Blueprint`}
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }} />
              <div className="text-center w-56">
                <p className="text-sm mb-2">
                  {loadPct > 0 ? `Decrypting your Blueprint… ${loadPct}%` : "Preparing your Blueprint…"}
                </p>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(245,241,232,0.08)" }}>
                  <div
                    className="h-full transition-all duration-200"
                    style={{ width: `${loadPct}%`, background: "var(--orange)" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom strip */}
        <p className="text-center text-[11px] opacity-40 mt-3 shrink-0">
          Viewing only — this document can&apos;t be downloaded, printed or shared from the viewer.
        </p>
      </div>
    </div>
  );
}
