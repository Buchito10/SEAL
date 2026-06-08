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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveSession(token: string, user: SessionUser) {
  if (!canUseStorage()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateSessionUser(user: Partial<SessionUser>) {
  if (!canUseStorage()) return;
  const current = getUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }));
}

export function getToken() {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
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
  return Boolean(getToken() && getUser());
}

export function logout() {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
