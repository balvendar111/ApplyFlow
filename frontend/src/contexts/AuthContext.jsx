import { createContext, useContext, useState, useEffect, useRef } from "react";
import { API_BASE, getToken, setToken, clearToken, safeJson } from "../lib/api";

const AuthContext = createContext(null);

const INACTIVITY_MINUTES = 5;
const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;
const CHECK_INTERVAL_MS = 30_000; // check every 30 sec
const ACTIVITY_THROTTLE_MS = 1000; // avoid flooding on mousemove

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const lastHandleRef = useRef(0);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(safeJson)
      .then((data) => data.user && setUser(data.user))
      .catch(() => setUser({ email: "signed in" }))
      .finally(() => setLoading(false));
  }, []);

  // 5-min inactivity auto-logout (only when authenticated)
  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now(); // reset timer on login/re-auth
    const onActivity = () => {
      const now = Date.now();
      if (now - lastHandleRef.current < ACTIVITY_THROTTLE_MS) return;
      lastHandleRef.current = now;
      lastActivityRef.current = now;
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        clearToken();
        setUser(null);
      }
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity));
    const interval = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
    };
  }, [user]);

  const login = async (email, password) => {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data.detail || "Login failed");
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (email, password) => {
    const r = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data.detail || "Registration failed");
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const r = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data.detail || "Google sign-in failed");
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const loginWithToken = (token, userData) => {
    setToken(token);
    setUser(userData);
  };

  const isAuthenticated = !!getToken();

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithToken, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
