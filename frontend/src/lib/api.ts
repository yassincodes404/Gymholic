const DEFAULT_BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8080/api" : "/api");

const DEFAULT_FRONTEND_API_BASE_PATH = "/app-api";

export function getBackendApiBaseUrl() {
  return DEFAULT_BACKEND_API_BASE_URL.replace(/\/$/, "");
}

export function getFrontendApiPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${DEFAULT_FRONTEND_API_BASE_PATH}${normalized}`;
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("jwt_token");
}

export function getClientTimezone() {
  if (typeof window === "undefined") {
    return "UTC";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function toTemplateTimeLabel(displayTime: string) {
  const [hours, minutes] = displayTime.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return displayTime;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function buildBackendApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${getBackendApiBaseUrl()}/${normalized}`;
}
