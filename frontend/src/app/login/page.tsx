/*!
  GymHolic Login — client sign-in wired to POST /api/auth/login (Spring Boot).
  Google Sign-In posts the Google ID token to /api/auth/google/signin.
*/

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { googleSignIn, login } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: Record<string, string>): void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setBusy(true);
          setError(null);
          try {
            const user = await googleSignIn(response.credential);
            router.push(user.role === "ADMIN" ? "/admin" : "/");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Google sign-in failed.");
          } finally {
            setBusy(false);
          }
        },
      });
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: "320",
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      router.push(user.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Welcome back</h1>
        <p className="text-neutral-400 text-center mb-8">
          Sign in to book and manage your consultations.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-neutral-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-neutral-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-white text-neutral-950 font-semibold py-2.5 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-6">
                <span className="h-px flex-1 bg-neutral-800" />
                <span className="text-xs text-neutral-500 uppercase tracking-wider">or</span>
                <span className="h-px flex-1 bg-neutral-800" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
            </>
          )}

          <p className="text-sm text-neutral-400 text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-neutral-100 underline hover:no-underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-sm text-neutral-500 text-center mt-6">
          Expert or administrator?{" "}
          <Link href="/admin/login" className="underline hover:no-underline">
            Admin sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
