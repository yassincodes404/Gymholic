/*!
  GymHolic Login — client sign-in wired to POST /api/auth/login (Spring Boot).
  Google Sign-In posts the Google ID token to /api/auth/google/signin.
  Passwordless option: "Email me a code" asks for a 6-digit OTP instead.
  Password flows may first ask for a confirmation code (unverified email).
*/

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import {
  googleSignIn,
  login,
  requestOtpCode,
  verifyOtpCode,
  VerificationRequiredError,
  type AuthUser,
} from "@/lib/auth";
import { setupGoogleSignIn, whenGoogleReady } from "@/lib/googleSignIn";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Mode = "password" | "otp-request" | "otp-verify";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set when the backend answered with an email-code challenge. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  function finishSignIn(user: AuthUser) {
    // ?next=/path sends the user back where they came from (same-origin
    // relative paths only — e.g. a locked Blueprint they tried to open).
    const next = searchParams.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.push(user.role === "ADMIN" ? "/admin" : safeNext ?? "/");
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const detach = setupGoogleSignIn(GOOGLE_CLIENT_ID, async (credential) => {
      setBusy(true);
      setError(null);
      try {
        const user = await googleSignIn(credential);
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
    });
    whenGoogleReady().then(() => {
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: "320",
        });
      }
    });
    return detach;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
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

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestOtpCode(email);
      setMode("otp-verify");
      setNotice(`We emailed a 6-digit sign-in code to ${email}. It expires in 10 minutes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await verifyOtpCode(email, code);
      finishSignIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";
  const submitClass =
    "w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50";

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 text-sm text-paper/60 hover:text-paper transition-colors"
      >
        ← Back to gymholic.ae
      </Link>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Welcome back</h1>
        <p className="text-paper/60 text-center mb-8">
          Sign in to book and manage your consultations.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          {pendingEmail ? (
            <EmailVerificationForm email={pendingEmail} onVerified={finishSignIn} />
          ) : mode === "otp-request" ? (
            <form onSubmit={handleOtpRequest} className="space-y-5">
              <h2 className="text-lg font-semibold">Sign in with an email code</h2>
              <p className="text-sm text-paper/60">
                No password needed — we&apos;ll email you a one-time 6-digit code.
              </p>
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
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className={submitClass}>
                {busy ? "Sending…" : "Email me a code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setError(null);
                }}
                className="w-full text-sm text-paper/60 hover:text-paper"
              >
                ← Use password instead
              </button>
            </form>
          ) : mode === "otp-verify" ? (
            <form onSubmit={handleOtpVerify} className="space-y-5">
              <h2 className="text-lg font-semibold">Enter your sign-in code</h2>
              {notice && <p className="text-sm text-paper/60">{notice}</p>}
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-2 text-paper/75">
                  6-digit code
                </label>
                <input
                  type="text"
                  id="code"
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  placeholder="······"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className={submitClass}>
                {busy ? "Signing in…" : "Sign In"}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  disabled={busy}
                  className="text-orange underline hover:no-underline disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await requestOtpCode(email);
                      setNotice("A fresh code is on its way (requests are limited to once a minute).");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not re-send.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Re-send code
                </button>
                <button
                  type="button"
                  className="text-paper/60 hover:text-paper"
                  onClick={() => {
                    setMode("password");
                    setCode("");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Use password →
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
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
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-paper/75">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-orange underline hover:no-underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    id="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className={submitClass}>
                  {busy ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode("otp-request");
                  setError(null);
                }}
                className="w-full mt-4 text-sm text-paper/60 hover:text-paper underline underline-offset-4"
              >
                Prefer no password? Email me a sign-in code
              </button>

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
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
