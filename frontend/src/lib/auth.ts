/*!
  GymHolic Auth Client — talks to the Spring Boot backend (/api/auth, /api/admin/auth).
  Tokens are stored in localStorage (agreed temporary strategy; HttpOnly cookies later).
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
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: AuthUser["role"];
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
  window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  const user: AuthUser = {
    userId: data.userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
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
  return persistSession(payload.data as AuthResponse);
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
