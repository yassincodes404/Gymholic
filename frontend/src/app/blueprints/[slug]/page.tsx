"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";
import { BlueprintGrid } from "@/components/blueprints/BlueprintGrid";
import { SecureBlueprintViewer } from "@/components/blueprints/SecureBlueprintViewer";
import {
  coverLinesFromTitle,
  fetchStoreProductDetail,
  fetchStoreLibrary,
  storeCoverUrl,
  type StoreProductDetail,
} from "@/lib/store";
import { getStoredAuthToken } from "@/lib/auth";
import { useCart } from "@/components/cart/CartContext";

/*!
 * Blueprint product detail — two-column layout with the secure inline PDF
 * viewer for accessible items (free + signed in, or purchased). Guests are
 * sent to sign in; unknown slugs 404.
 */
export default function BlueprintDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const { addItem, isInCart } = useCart();

  const [detail, setDetail] = useState<StoreProductDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string> | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  // localStorage is unreadable during SSR — resolve auth after mount to keep
  // hydration and the rendered CTA consistent.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;
    setDetail(null);
    setMissing(false);
    setViewerOpen(false);
    fetchStoreProductDetail(slug).then((data) => {
      if (!cancelled) {
        if (data) setDetail(data);
        else setMissing(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Ownership comes from the library (free products are accessible anyway).
  useEffect(() => {
    const token = getStoredAuthToken();
    setSignedIn(!!token);
    if (!token) {
      setOwnedSlugs(new Set());
      return;
    }
    let cancelled = false;
    fetchStoreLibrary(token).then((library) => {
      if (!cancelled) setOwnedSlugs(new Set((library ?? []).map((i) => i.slug)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ?open=1 (e.g. straight from the order-success CTA) drops the user
  // directly into the secure viewer once access is confirmed.
  const autoOpenChecked = useRef(false);
  useEffect(() => {
    if (autoOpenChecked.current || !detail || !ownedSlugs) return;
    autoOpenChecked.current = true;
    const wantsOpen = new URLSearchParams(window.location.search).get("open") === "1";
    if (wantsOpen && signedIn && (detail.isFree || ownedSlugs.has(detail.slug))) {
      setViewerOpen(true);
    }
  }, [detail, ownedSlugs, signedIn]);

  if (missing) notFound();

  if (!detail || !ownedSlugs) {
    return (
      <>
        <Header />
        <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
          <p className="text-sm opacity-50">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  const accessible = detail.isFree || ownedSlugs.has(detail.slug);
  const inCart = isInCart(detail.slug);

  function openViewer() {
    if (!signedIn) {
      router.push(`/login?next=/blueprints/${detail!.slug}`);
      return;
    }
    setViewerOpen(true);
  }

  return (
    <>
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="mb-10">
          <Link href="/blueprints" className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100">
            &larr; All Blueprints
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mb-20">
          <div className="max-w-md w-full mx-auto md:mx-0">
            {detail.hasCover ? (
              <div
                className="aspect-[3/4] rounded-lg overflow-hidden"
                style={{ border: "1px solid rgba(255,106,0,0.2)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storeCoverUrl(detail.slug)}
                  alt={`${detail.title} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <BlueprintCover lines={coverLinesFromTitle(detail.title)} />
            )}
          </div>

          <div className="flex flex-col">
            {detail.category && (
              <span
                className="text-xs uppercase tracking-widest px-4 py-2 rounded-full self-start mb-5"
                style={{ background: "rgba(255,106,0,0.12)", color: "var(--orange)" }}
              >
                {detail.category.name}
              </span>
            )}
            <h1 className="display-text text-3xl md:text-4xl mb-4">{detail.title}</h1>
            <p className="opacity-70 mb-6">{detail.shortDescription}</p>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="display-text text-3xl" style={{ color: "var(--orange)" }}>
                {detail.isFree ? "Free" : `$${detail.price}`}
              </span>
              {detail.isFree && (
                <span
                  className="text-xs uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,106,0,0.15)", color: "var(--orange)" }}
                >
                  Free
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed opacity-80 whitespace-pre-line mb-10">
              {detail.description ?? detail.shortDescription}
            </p>

            <div className="flex flex-wrap gap-4 mt-auto">
              {accessible ? (
                <button type="button" onClick={openViewer} className="btn-pill">
                  Open in Viewer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addItem(detail.slug)}
                  className="btn-pill disabled:opacity-50"
                  disabled={inCart}
                >
                  {inCart ? "In Cart" : signedIn ? "Add to Cart" : "Buy to Unlock"}
                </button>
              )}
              {!signedIn && !accessible && (
                <Link href={`/login?next=/blueprints/${detail.slug}`} className="btn-pill btn-pill--ghost">
                  Sign in to purchase
                </Link>
              )}
            </div>
            {accessible && !signedIn && (
              <p className="text-xs opacity-50 mt-4">
                Sign in to open the viewer.
              </p>
            )}
          </div>
        </div>

        {viewerOpen && signedIn && (
          <SecureBlueprintViewer
            slug={detail.slug}
            token={getStoredAuthToken()!}
            title={detail.title}
            onClose={() => setViewerOpen(false)}
          />
        )}

        {detail.related.length > 0 && (
          <div>
            <h2 className="display-text text-2xl mb-8 px-6 md:px-0">You may also like</h2>
            <BlueprintGrid products={detail.related} />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
