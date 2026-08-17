/*!
  GymHolic Login — client sign-in wired to POST /api/auth/login (Spring Boot).
  Google Sign-In posts the Google ID token to /api/auth/google/signin.
  Both flows may first ask for a 6-digit email confirmation code.
*/

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import {
  googleSignIn,
  login,
  VerificationRequiredError,
  type AuthUser,
} from "@/lib/auth";

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
  /** Set when the backend answered with an email-code challenge. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  function finishSignIn(user: AuthUser) {
    router.push(user.role === "ADMIN" ? "/admin" : "/");
  }

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
            finishSignIn(user);
          } catch (e) {
            if (e instanceof VerificationRequiredError) {
              setPendingEmail(e.email);
            } else {
              setError(e instanceof Error ? e.message : "Google sign-in failed.");
            }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      finishSignIn(user);
    } catch (err) {
      if (err instanceof VerificationRequiredError) {
        setPendingEmail(err.email);
      } else {
        setError(err instanceof Error ? err.message : "Login failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Welcome back</h1>
        <p className="text-paper/60 text-center mb-8">
          Sign in to book and manage your consultations.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          {pendingEmail ? (
            <EmailVerificationForm email={pendingEmail} onVerified={finishSignIn} />
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-paper/75">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2 text-paper/75">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60"
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
                  className="w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50"
                >
                  {busy ? "Signing in…" : "Sign In"}
                </button>
              </form>

              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-3 my-6">
                    <span className="h-px flex-1 bg-paper/10" />
                    <span className="text-xs text-paper/50 uppercase tracking-wider">or</span>
                    <span className="h-px flex-1 bg-paper/10" />
                  </div>
                  <div ref={googleBtnRef} className="flex justify-center" />
                </>
              )}

              <p className="text-sm text-paper/60 text-center mt-6">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-orange underline hover:no-underline">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-paper/50 text-center mt-6">
          Expert or administrator?{" "}
          <Link href="/admin/login" className="text-orange underline hover:no-underline">
            Admin sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
