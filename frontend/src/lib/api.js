/**
 * API base URL.
 * - Production (build): "" = same origin (when served from backend)
 * - Dev: 127.0.0.1:8000 (avoids Cursor proxy). Override: VITE_API_BASE in .env
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

const TOKEN_KEY = "applyflow_token";

/** sessionStorage = logout when tab/window closes; localStorage = persist across sessions */
const storage = typeof window !== "undefined" ? sessionStorage : null;

export function getToken() {
  return storage?.getItem(TOKEN_KEY) ?? null;
}

export function setToken(token) {
  storage?.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  storage?.removeItem(TOKEN_KEY);
}

/**
 * Fetch with Authorization header if token exists.
 */
export function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

/**
 * Safe JSON parse - when backend returns HTML/plain text, avoid crash.
 */
export async function safeJson(r) {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
