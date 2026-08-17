/*!
  GymHolic Auth Client — talks to the Spring Boot backend (/api/auth, /api/admin/auth).
  Tokens are stored in localStorage (agreed temporary strategy; HttpOnly cookies later).
  Sign-up / sign-in may return a "verificationRequired" challenge instead of
  tokens — the caller catches VerificationRequiredError and asks for the
  6-digit email code.
*/

import { buildBackendApiUrl } from "@/lib/api";

const ACCESS_TOKEN_KEY = "jwt_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "gymholic_user";

/** Fired on window whenever the signed-in user changes, so headers/menus can react. */
export const AUTH_CHANGED_EVENT = "gymholic:auth-changed";

export interface AuthUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "TRAINER" | "CLIENT";
}

interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  userId?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: AuthUser["role"];
  emailVerified?: boolean;
  /** True when the backend sent a code and expects verifyEmail() next. */
  verificationRequired?: boolean;
}

/** Thrown when the backend answered with an email-code challenge instead of a session. */
export class VerificationRequiredError extends Error {
  readonly email: string;

  constructor(email: string) {
    super("Enter the confirmation code we emailed you.");
    this.name = "VerificationRequiredError";
    this.email = email;
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function persistSession(data: AuthResponse): AuthUser {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken as string);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken as string);
  const user: AuthUser = {
    userId: data.userId as number,
    email: data.email,
    firstName: data.firstName as string,
    lastName: data.lastName as string,
    role: data.role as AuthUser["role"],
  };
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  return user;
}

async function postAuth(path: string, body: unknown): Promise<AuthUser> {
  const res = await fetch(buildBackendApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success || !payload?.data) {
    throw new Error(payload?.message || "Authentication failed. Please try again.");
  }
  const data = payload.data as AuthResponse;
  if (data.verificationRequired || !data.accessToken) {
    throw new VerificationRequiredError(data.email);
  }
  return persistSession(data);
}

export function login(email: string, password: string) {
  return postAuth("auth/login", { email, password });
}

export function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  return postAuth("auth/register", input);
}

export function adminLogin(email: string, password: string) {
  return postAuth("admin/auth/login", { email, password });
}

export function googleSignIn(idToken: string) {
  return postAuth("auth/google/signin", { idToken });
}

/** Submits the 6-digit email code; returns the signed-in user on success. */
export async function verifyEmail(email: string, code: string): Promise<AuthUser> {
  const res = await fetch(buildBackendApiUrl("auth/verify-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success || !payload?.data) {
    throw new Error(payload?.message || "Verification failed. Please try again.");
  }
  return persistSession(payload.data as AuthResponse);
}

/** Asks the backend to email a fresh code (rate-limited to once a minute). */
export async function resendVerificationCode(email: string): Promise<void> {
  const res = await fetch(buildBackendApiUrl("auth/resend-verification"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || "Could not re-send the code. Try again shortly.");
  }
}

/** Verifies the stored token against the backend and returns the current user. */
export async function fetchCurrentUser(token: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  const res = await fetch(buildBackendApiUrl("users/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  if (!payload?.success || !payload?.data) return null;
  const d = payload.data;
  return {
    userId: d.id ?? d.userId,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    role: d.role,
  };
}
