import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  type EmployeeOption,
  type NewAccountDraft,
  type UserAccountRow,
} from '@/features/users/userRules';

const LOAD_ERROR = 'Không thể tải danh sách tài khoản.';
const LINK_TAKEN_MESSAGE = 'Hồ sơ nhân viên này đã được liên kết với tài khoản khác.';

interface AppUserRow {
  system_uid: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  employee_system_uid: string | null;
}

interface EmployeeRow {
  system_uid: string;
  code: string;
  full_name: string;
  department: string;
}

function isAppUserRow(value: unknown): value is AppUserRow {
  const row = value as AppUserRow;
  return (
    typeof row?.system_uid === 'string' &&
    typeof row.username === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.role === 'string' &&
    typeof row.is_active === 'boolean' &&
    (row.employee_system_uid === null || typeof row.employee_system_uid === 'string')
  );
}

function isEmployeeRow(value: unknown): value is EmployeeRow {
  const row = value as EmployeeRow;
  return (
    typeof row?.system_uid === 'string' &&
    typeof row.code === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.department === 'string'
  );
}

function assertRows<T>(data: unknown, guard: (value: unknown) => value is T): T[] {
  if (!Array.isArray(data) || !data.every(guard)) throw new Error(LOAD_ERROR);
  return data;
}

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: unknown } | null;
    if (typeof body?.error === 'string') return body.error;
  }
  return fallback;
}

async function invokeAccountAction(body: Record<string, unknown>, fallback: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>('manage-user-accounts', { body });
  if (error) throw new Error(await functionErrorMessage(error, fallback));
  if (data?.ok !== true) throw new Error(fallback);
}

export async function fetchUserAccounts(): Promise<{ accounts: UserAccountRow[]; employees: EmployeeOption[] }> {
  const [userResult, employeeResult] = await Promise.all([
    supabase
      .from('app_users')
      .select('system_uid, username, full_name, role, is_active, employee_system_uid')
      .order('username', { ascending: true }),
    supabase.from('employees').select('system_uid, code, full_name, department').order('code', { ascending: true }),
  ]);
  if (userResult.error) throw userResult.error;
  if (employeeResult.error) throw employeeResult.error;

  const employees = assertRows(employeeResult.data, isEmployeeRow).map((row) => ({
    systemUid: row.system_uid,
    code: row.code,
    fullName: row.full_name,
    department: row.department,
  }));
  const employeeByUid = new Map(employees.map((employee) => [employee.systemUid, employee]));

  const accounts = assertRows(userResult.data, isAppUserRow).map((row): UserAccountRow => {
    return {
      systemUid: row.system_uid,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      employeeSystemUid: row.employee_system_uid,
      employee: row.employee_system_uid ? employeeByUid.get(row.employee_system_uid) ?? null : null,
    };
  });

  return { accounts, employees };
}

export async function createUserAccount(draft: NewAccountDraft): Promise<void> {
  await invokeAccountAction(
    {
      action: 'create',
      username: draft.username.trim(),
      full_name: draft.fullName.trim(),
      role: draft.role,
      employee_system_uid: draft.employeeSystemUid || null,
    },
    'Không thể tạo tài khoản. Vui lòng thử lại.',
  );
}

export async function resetAccountPassword(systemUid: string): Promise<void> {
  await invokeAccountAction(
    { action: 'reset_password', system_uid: systemUid },
    'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
  );
}

async function updateAppUser(
  systemUid: string,
  values: { full_name?: string; role?: string; is_active?: boolean; employee_system_uid?: string | null },
  fallback: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('app_users')
    .update(values)
    .eq('system_uid', systemUid)
    .select('system_uid');
  if (error) throw new Error(fallback);
  if (!data?.length) throw new Error(fallback);
}

export async function setAccountActive(systemUid: string, isActive: boolean): Promise<void> {
  await updateAppUser(systemUid, { is_active: isActive }, 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
}

export async function updateAccountDetails(
  systemUid: string,
  values: { fullName: string; role: string },
): Promise<void> {
  await updateAppUser(
    systemUid,
    { full_name: values.fullName, role: values.role },
    'Không thể cập nhật thông tin tài khoản. Vui lòng thử lại.',
  );
}

export async function unlinkAccountFromEmployee(systemUid: string): Promise<void> {
  await updateAppUser(
    systemUid,
    { employee_system_uid: null },
    'Không thể hủy liên kết hồ sơ. Vui lòng thử lại.',
  );
}

export async function linkAccountToEmployee(systemUid: string, employeeSystemUid: string): Promise<void> {
  const { data, error } = await supabase
    .from('app_users')
    .update({ employee_system_uid: employeeSystemUid })
    .eq('system_uid', systemUid)
    .select('system_uid');
  if (error?.code === '23505') throw new Error(LINK_TAKEN_MESSAGE);
  if (error || !data?.length) throw new Error('Không thể liên kết hồ sơ. Vui lòng thử lại.');
}
