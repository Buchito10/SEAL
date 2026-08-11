export type UserRole = "ADMIN" | "CLIENT";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  must_change_password?: boolean;
  status?: string;
  profile_completed?: boolean;
};

const TOKEN_KEY = "seal_token";
const USER_KEY = "seal_user";
const SESSION_EVENT = "seal:session-change";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifySessionChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
}

export function saveSession(user: SessionUser) {
  if (!canUseStorage()) return;
  // El JWT vive únicamente en una cookie HttpOnly; eliminamos tokens heredados.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySessionChange();
}

export function updateSessionUser(user: Partial<SessionUser>) {
  if (!canUseStorage()) return;
  const current = getUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }));
  notifySessionChange();
}

/** @deprecated La sesión ya no expone el JWT a JavaScript. */
export function getToken() {
  return null;
}

export function getUser() {
  if (!canUseStorage()) return null;
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;

  try {
    return JSON.parse(user) as SessionUser;
  } catch {
    logout();
    return null;
  }
}

export function hasSession() {
  return Boolean(getUser());
}

export function logout() {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifySessionChange();
}

export function subscribeSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}
