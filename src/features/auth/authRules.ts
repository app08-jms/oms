import { SUPER_ADMIN_ROLE_KEY } from '@/features/permissions/permissionRules';

export const SESSION_DURATION_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 6;

export interface AuthAccount {
  systemUid: string;
  username: string;
  fullName: string;
  roleKey: string;
  employeeCode: string | null;
  department: string | null;
}

export interface HotelRef {
  id: string;
  systemHotelId: string;
  name: string;
  address: string | null;
  idPrefix: string | null;
}

export interface StoredSession {
  account: AuthAccount;
  hotel: HotelRef;
  token: string;
  expiresAt: number;
}

export interface PasswordChangeInput {
  current: string;
  next: string;
  confirm: string;
}

export function requiresHotelPicker(account: AuthAccount, hotels: HotelRef[]): boolean {
  return account.roleKey === SUPER_ADMIN_ROLE_KEY || hotels.length > 1;
}

export function isSessionExpired(session: StoredSession, now: number = Date.now()): boolean {
  return now >= session.expiresAt;
}

export function validatePasswordChange(input: PasswordChangeInput): string | null {
  if (!input.current) return 'Vui lòng nhập mật khẩu hiện tại.';
  if (input.next.length < MIN_PASSWORD_LENGTH) return `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (input.next === input.current) return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  if (input.confirm !== input.next) return 'Xác nhận mật khẩu không khớp.';
  return null;
}
