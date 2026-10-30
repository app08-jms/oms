import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { accountEmailFor, type AuthAccount, type HotelRef } from '@/features/auth/authRules';
import { SUPER_ADMIN_ROLE_KEY, applyOverrides, type PermissionGrid } from '@/features/permissions/permissionRules';
import { fetchUserPermissionContext } from '@/features/permissions/permissionService';
import { supabase } from '@/lib/supabase';

const INVALID_CREDENTIALS = 'Tài khoản hoặc mật khẩu không đúng.';
const NETWORK_ERROR = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
const UNLINKED_ACCOUNT = 'Tài khoản chưa được liên kết với hồ sơ người dùng.';
const INACTIVE_ACCOUNT = 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.';
const HOTEL_LOAD_ERROR = 'Không thể tải danh sách khách sạn.';
const PROFILE_LOAD_ERROR = 'Không thể tải thông tin tài khoản.';
const PERMISSION_LOAD_ERROR = 'Không thể tải quyền truy cập. Vui lòng đăng nhập lại.';
const HOTEL_REF_COLUMNS = 'id, system_hotel_id, name, address, id_prefix';

interface AccountRow {
  system_uid: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  employee_system_uid: string | null;
}

interface EmployeeRef {
  code: string;
  department: string;
}

function isEmployeeRef(value: unknown): value is EmployeeRef {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.code === 'string' && typeof row.department === 'string';
}

interface HotelRow {
  id: string;
  system_hotel_id: string;
  name: string;
  address: string | null;
  id_prefix: string | null;
}

function isAccountRow(value: unknown): value is AccountRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.system_uid === 'string' &&
    typeof row.username === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.role === 'string' &&
    typeof row.is_active === 'boolean'
  );
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

export async function endAuthSession(): Promise<void> {
  await supabase.auth.signOut();
}

export async function signInWithUsername(username: string, password: string): Promise<AuthAccount> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: accountEmailFor(username),
    password,
  });
  if (error instanceof AuthRetryableFetchError) throw new Error(NETWORK_ERROR);
  if (error || !data.user) throw new Error(INVALID_CREDENTIALS);

  const { data: row, error: profileError } = await supabase
    .from('app_users')
    .select('system_uid, username, full_name, role, is_active, employee_system_uid')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (profileError) {
    await endAuthSession();
    throw new Error(PROFILE_LOAD_ERROR);
  }
  if (!row) {
    await endAuthSession();
    throw new Error(UNLINKED_ACCOUNT);
  }
  if (!isAccountRow(row)) {
    await endAuthSession();
    throw new Error(PROFILE_LOAD_ERROR);
  }
  if (!row.is_active) {
    await endAuthSession();
    throw new Error(INACTIVE_ACCOUNT);
  }

  const employee = await fetchLinkedEmployee(row.employee_system_uid);

  return {
    systemUid: row.system_uid,
    authUserId: data.user.id,
    username: row.username,
    fullName: row.full_name,
    roleKey: row.role,
    employeeCode: employee?.code ?? null,
    department: employee?.department ?? null,
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

export async function changeOwnPassword(username: string, current: string, next: string): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: accountEmailFor(username),
    password: current,
  });
  if (verifyError) throw new Error('Mật khẩu hiện tại không đúng.');

  const { error } = await supabase.auth.updateUser({ password: next });
  if (!error) return;
  if (error.code === 'weak_password') {
    throw new Error('Mật khẩu mới chưa đủ mạnh. Hãy dùng mật khẩu dài hơn hoặc khó đoán hơn.');
  }
  if (error.code === 'same_password') throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
  throw new Error('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
}

