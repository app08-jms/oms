import type { HotelRef, StoredSession } from '@/features/auth/authRules';

const SESSION_STORAGE_KEY = 'oms.session';

function isHotelRef(value: unknown): value is HotelRef {
  if (!value || typeof value !== 'object') return false;
  const hotel = value as Record<string, unknown>;
  return typeof hotel.id === 'string' && typeof hotel.systemHotelId === 'string' && typeof hotel.name === 'string';
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  const account = session.account as Record<string, unknown> | undefined;
  return (
    typeof session.expiresAt === 'number' &&
    typeof session.token === 'string' &&
    isHotelRef(session.hotel) &&
    !!account &&
    typeof account.systemUid === 'string' &&
    typeof account.username === 'string' &&
    typeof account.fullName === 'string' &&
    typeof account.roleKey === 'string'
  );
}

export function readStoredSession(): StoredSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: StoredSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
