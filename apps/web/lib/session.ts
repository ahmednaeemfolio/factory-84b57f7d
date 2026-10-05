export type UserRole = 'MEMBER' | 'ADMIN';

export interface SessionUser {
  id: string;
  displayName: string;
  role: UserRole;
}

const TOKEN_KEY = 'kudos.jwt';
const USER_KEY = 'kudos.user';

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getToken(): string | null {
  return hasBrowserStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function getSessionUser(): SessionUser | null {
  if (!hasBrowserStorage()) return null;
  const serialized = window.localStorage.getItem(USER_KEY);
  if (!serialized) return null;
  try {
    const user = JSON.parse(serialized) as Partial<SessionUser>;
    if (
      typeof user.id === 'string' &&
      typeof user.displayName === 'string' &&
      (user.role === 'ADMIN' || user.role === 'MEMBER')
    ) {
      return user as SessionUser;
    }
  } catch {
    // Ignore malformed cached profile and let the app render without it.
  }
  return null;
}

export function storeSession(token: string, user: SessionUser): void {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
