/*!
  GymHolic Admin Login — wired to POST /api/admin/auth/login (ADMIN users only).
*/

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin(email, password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Admin sign-in</h1>
        <p className="text-paper/60 text-center mb-8">
          Restricted to GymHolic administrators.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-paper/75">
                Email
              </label>
              <input type="email" id="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={inputClass}
                placeholder="admin@gymholic.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-paper/75">
                Password
              </label>
              <input type="password" id="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass}
                placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-red-400 text-sm" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50">
              {busy ? "Signing in…" : "Sign In to Dashboard"}
            </button>
          </form>
        </div>

        <p className="text-sm text-paper/50 text-center mt-6">
          <Link href="/login" className="text-orange underline hover:no-underline">
            ← Back to client sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
