import Link from "next/link";

/*!
  GymHolic 404 — branded dead-end. Server component: no motion, just the
  voice (void background, ember accents, a gym joke and two ways out).
*/
export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 section-dark"
    >
      <p className="text-xs uppercase tracking-[0.35em] mb-5" style={{ color: "var(--orange)" }}>
        404 — Page not found
      </p>
      <h1 className="display-hero text-4xl md:text-6xl max-w-2xl mb-5">
        This page skipped leg day.
      </h1>
      <p className="opacity-60 max-w-md mb-10">
        The page you&apos;re looking for doesn&apos;t exist or moved. Back to
        the training floor.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/" className="btn-pill">
          Back to Home
        </Link>
        <Link href="/book" className="btn-pill btn-pill--ghost">
          Book a Session
        </Link>
      </div>
    </main>
  );
}
