/*!
  GymHolic Register — client registration wired to POST /api/auth/register (Spring Boot).
  After creating the account, a 6-digit email confirmation code must be entered
  before the session starts.
*/

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import {
  googleSignIn,
  register,
  VerificationRequiredError,
  type AuthUser,
} from "@/lib/auth";
import { setupGoogleSignIn, whenGoogleReady } from "@/lib/googleSignIn";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set after registration while we wait for the email code. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  function finishSignUp(user: AuthUser) {
    router.push(user.role === "ADMIN" ? "/admin" : "/");
  }

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  // Google sign-up: the backend creates/links the account and — on first
  // sign-in — emails a 6-digit code before any session starts.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const detach = setupGoogleSignIn(GOOGLE_CLIENT_ID, async (credential) => {
      setBusy(true);
      setError(null);
      try {
        const user = await googleSignIn(credential);
        finishSignUp(user);
      } catch (e) {
        if (e instanceof VerificationRequiredError) {
          setPendingEmail(e.email);
        } else {
          setError(e instanceof Error ? e.message : "Google sign-up failed.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      router.push("/");
    } catch (err) {
      if (err instanceof VerificationRequiredError) {
        setPendingEmail(err.email);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Create your account</h1>
        <p className="text-paper/60 text-center mb-8">
          Book consultations and track your assessments.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          {pendingEmail ? (
            <EmailVerificationForm email={pendingEmail} onVerified={finishSignUp} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-paper/75">
                    First name
                  </label>
                  <input id="firstName" required autoComplete="given-name" value={form.firstName}
                    onChange={update("firstName")} className={inputClass} placeholder="Ahmed" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-paper/75">
                    Last name
                  </label>
                  <input id="lastName" required autoComplete="family-name" value={form.lastName}
                    onChange={update("lastName")} className={inputClass} placeholder="Mohamed" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-paper/75">
                  Email
                </label>
                <input type="email" id="email" required autoComplete="email" value={form.email}
                  onChange={update("email")} className={inputClass} placeholder="you@example.com" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-paper/75">
                  Password
                </label>
                <input type="password" id="password" required minLength={8} autoComplete="new-password"
                  value={form.password} onChange={update("password")} className={inputClass}
                  placeholder="At least 8 characters" />
              </div>

              {error && (
                <p className="text-red-400 text-sm" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50">
                {busy ? "Creating account…" : "Create Account"}
              </button>

              <p className="text-xs text-paper/50 text-center">
                We&apos;ll email you a 6-digit code to confirm your account before
                your first sign-in.
              </p>
            </form>
          )}

          {!pendingEmail && GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-6">
                <span className="h-px flex-1 bg-paper/10" />
                <span className="text-xs text-paper/50 uppercase tracking-wider">or</span>
                <span className="h-px flex-1 bg-paper/10" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
              <p className="text-xs text-paper/50 text-center mt-3">
                Google accounts also confirm with an emailed code the first time.
              </p>
            </>
          )}

          {!pendingEmail && (
            <p className="text-sm text-paper/60 text-center mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-orange underline hover:no-underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
