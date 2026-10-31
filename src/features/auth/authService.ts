import { type AuthAccount, type HotelRef } from '@/features/auth/authRules';
import { SUPER_ADMIN_ROLE_KEY, applyOverrides, type PermissionGrid } from '@/features/permissions/permissionRules';
import { fetchUserPermissionContext } from '@/features/permissions/permissionService';
import { supabase } from '@/lib/supabase';

const INVALID_CREDENTIALS = 'Tài khoản hoặc mật khẩu không đúng.';
const NETWORK_ERROR = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
const PROFILE_LOAD_ERROR = 'Không thể tải thông tin tài khoản.';
const HOTEL_LOAD_ERROR = 'Không thể tải danh sách khách sạn.';
const PERMISSION_LOAD_ERROR = 'Không thể tải quyền truy cập. Vui lòng đăng nhập lại.';
const HOTEL_REF_COLUMNS = 'id, system_hotel_id, name, address, id_prefix';

interface LoginAccountPayload {
  systemUid: string;
  username: string;
  fullName: string;
  roleKey: string;
  employeeSystemUid: string | null;
}

interface LoginResponse {
  ok: boolean;
  token?: string;
  account?: LoginAccountPayload;
}

interface EmployeeRef {
  code: string;
  department: string;
}

interface HotelRow {
  id: string;
  system_hotel_id: string;
  name: string;
  address: string | null;
  id_prefix: string | null;
}

export interface LoginResult {
  account: AuthAccount;
  token: string;
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (row.ok === false) return true;
  const account = row.account as Record<string, unknown> | undefined;
  return (
    row.ok === true &&
    typeof row.token === 'string' &&
    !!account &&
    typeof account.systemUid === 'string' &&
    typeof account.username === 'string' &&
    typeof account.fullName === 'string' &&
    typeof account.roleKey === 'string' &&
    (account.employeeSystemUid === null || typeof account.employeeSystemUid === 'string')
  );
}

function isEmployeeRef(value: unknown): value is EmployeeRef {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.code === 'string' && typeof row.department === 'string';
}

function isHotelRow(value: unknown): value is HotelRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.system_hotel_id === 'string' &&
    typeof row.name === 'string' &&
    (row.address === null || typeof row.address === 'string') &&
    (row.id_prefix === null || typeof row.id_prefix === 'string')
  );
}

export async function signInWithUsername(username: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.rpc('login_app_user', {
    p_username: username.trim(),
    p_password: password,
  });
  if (error) throw new Error(NETWORK_ERROR);
  if (!isLoginResponse(data)) throw new Error(PROFILE_LOAD_ERROR);
  if (!data.ok || !data.token || !data.account) throw new Error(INVALID_CREDENTIALS);

  const employee = await fetchLinkedEmployee(data.account.employeeSystemUid);

  return {
    token: data.token,
    account: {
      systemUid: data.account.systemUid,
      username: data.account.username,
      fullName: data.account.fullName,
      roleKey: data.account.roleKey,
      employeeCode: employee?.code ?? null,
      department: employee?.department ?? null,
    },
  };
}

async function fetchLinkedEmployee(employeeSystemUid: string | null): Promise<EmployeeRef | null> {
  if (!employeeSystemUid) return null;
  const { data, error } = await supabase
    .from('employees')
    .select('code, department')
    .eq('system_uid', employeeSystemUid)
    .maybeSingle();
  if (error) throw new Error(PROFILE_LOAD_ERROR);
  if (!data || !isEmployeeRef(data)) throw new Error(PROFILE_LOAD_ERROR);
  return data;
}

export async function fetchAccountHotels(account: AuthAccount): Promise<HotelRef[]> {
  const isSuperAdmin = account.roleKey === SUPER_ADMIN_ROLE_KEY;
  const { data, error } = isSuperAdmin
    ? await supabase.from('hotels').select(HOTEL_REF_COLUMNS).order('name')
    : await supabase
        .from('app_user_hotels')
        .select(`hotels(${HOTEL_REF_COLUMNS})`)
        .eq('app_user_system_uid', account.systemUid);
  if (error || !Array.isArray(data)) throw new Error(HOTEL_LOAD_ERROR);

  const items: unknown[] = data;
  const rows = items.map((item) => (isSuperAdmin ? item : (item as { hotels?: unknown } | null)?.hotels));
  if (!rows.every(isHotelRow)) throw new Error(HOTEL_LOAD_ERROR);

  return rows.map((row) => ({
    id: row.id,
    systemHotelId: row.system_hotel_id,
    name: row.name,
    address: row.address,
    idPrefix: row.id_prefix,
  }));
}

export async function fetchEffectivePermissions(account: AuthAccount): Promise<PermissionGrid> {
  try {
    const { inherited, overrides } = await fetchUserPermissionContext(account.systemUid, account.roleKey);
    return applyOverrides(inherited, overrides);
  } catch {
    throw new Error(PERMISSION_LOAD_ERROR);
  }
}

export async function logoutAppUser(token: string): Promise<void> {
  await supabase.rpc('logout_app_user', { p_token: token });
}

export async function changeOwnPassword(token: string, current: string, next: string): Promise<void> {
  const { data, error } = await supabase.rpc('change_app_user_password', {
    p_token: token,
    p_current: current,
    p_next: next,
  });
  if (error) {
    if (error.code === '22023') throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (error.code === '42501') throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    throw new Error('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
  }
  if (data !== true) throw new Error('Mật khẩu hiện tại không đúng.');
}
