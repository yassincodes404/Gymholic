/*!
  GymHolic Register — client registration wired to POST /api/auth/register (Spring Boot).
*/

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500";

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Create your account</h1>
        <p className="text-neutral-400 text-center mb-8">
          Book consultations and track your assessments.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-neutral-300">
                  First name
                </label>
                <input id="firstName" required autoComplete="given-name" value={form.firstName}
                  onChange={update("firstName")} className={inputClass} placeholder="Ahmed" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-neutral-300">
                  Last name
                </label>
                <input id="lastName" required autoComplete="family-name" value={form.lastName}
                  onChange={update("lastName")} className={inputClass} placeholder="Mohamed" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-neutral-300">
                Email
              </label>
              <input type="email" id="email" required autoComplete="email" value={form.email}
                onChange={update("email")} className={inputClass} placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-neutral-300">
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
              className="w-full bg-white text-neutral-950 font-semibold py-2.5 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50">
              {busy ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-neutral-400 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-neutral-100 underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
