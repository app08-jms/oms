import { supabase } from '@/lib/supabase';
import {
  normalizeDraft,
  type EmployeeDraft,
  type EmployeeProfile,
  type EmploymentStatus,
  type ProvisioningOptions,
} from '@/features/employees/employeeRules';

const PROFILE_COLUMNS =
  'code, full_name, display_name, department, position, probation_date, official_date, employment_status, phone, email, has_account, app_user_system_uid, leave_tracking, initial_leave_days';

const DUPLICATE_CODE_MESSAGE = 'Mã NV đã tồn tại trong danh sách.';

interface EmployeeProfileRow {
  code: string;
  full_name: string;
  display_name: string | null;
  department: string;
  position: string | null;
  probation_date: string | null;
  official_date: string | null;
  employment_status: EmploymentStatus;
  phone: string | null;
  email: string | null;
  has_account: boolean;
  app_user_system_uid: string | null;
  leave_tracking: boolean;
  initial_leave_days: number;
}

export interface CreateEmployeesResult {
  incompleteCodes: string[];
}

function isProfileRow(value: unknown): value is EmployeeProfileRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.department === 'string' &&
    typeof row.employment_status === 'string' &&
    typeof row.has_account === 'boolean' &&
    typeof row.leave_tracking === 'boolean' &&
    typeof row.initial_leave_days === 'number'
  );
}

function toProfile(row: EmployeeProfileRow): EmployeeProfile {
  return {
    code: row.code,
    fullName: row.full_name,
    displayName: row.display_name ?? '',
    department: row.department,
    position: row.position ?? '',
    probationDate: row.probation_date,
    officialDate: row.official_date,
    employmentStatus: row.employment_status,
    phone: row.phone ?? '',
    email: row.email ?? '',
    hasAccount: row.has_account,
    appUserSystemUid: row.app_user_system_uid,
    leaveTracking: row.leave_tracking,
    initialLeaveDays: row.initial_leave_days,
  };
}

function toProfilePayload(draft: EmployeeDraft) {
  const values = normalizeDraft(draft);
  return {
    full_name: values.fullName,
    display_name: values.displayName || null,
    department: values.department,
    position: values.position || null,
    probation_date: values.probationDate || null,
    official_date: values.officialDate || null,
    employment_status: values.employmentStatus,
    phone: values.phone || null,
    email: values.email || null,
  };
}

function toDatabaseError(error: { code?: string; message: string }, fallback: string): Error {
  if (error.code === '23505') return new Error(DUPLICATE_CODE_MESSAGE);
  if (error.code === '23503') {
    return new Error('Nhân viên này đang có dữ liệu chấm công hoặc lịch làm việc nên chưa thể xóa.');
  }
  return new Error(fallback);
}

export async function fetchEmployeeProfiles(): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(PROFILE_COLUMNS)
    .order('code', { ascending: true });

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isProfileRow)) throw new Error('Dữ liệu hồ sơ nhân viên không hợp lệ.');
  return data.map(toProfile);
}

export async function insertEmployees(drafts: EmployeeDraft[], options: ProvisioningOptions): Promise<void> {
  const rows = drafts.map((draft) => ({
    code: normalizeDraft(draft).code,
    ...toProfilePayload(draft),
    leave_tracking: options.trackLeave,
    initial_leave_days: options.initialLeaveDays,
  }));

  const { error } = await supabase.from('employees').insert(rows);
  if (error) throw toDatabaseError(error, 'Không thể lưu hồ sơ nhân viên. Vui lòng thử lại.');
}

export async function updateEmployeeProfile(code: string, draft: EmployeeDraft): Promise<void> {
  const { error } = await supabase.from('employees').update(toProfilePayload(draft)).eq('code', code);
  if (error) throw toDatabaseError(error, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
}

export async function deleteEmployeeProfile(code: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('code', code);
  if (error) throw toDatabaseError(error, 'Không thể xóa nhân viên. Vui lòng thử lại.');
}

export async function applyLeaveOpening(code: string): Promise<void> {
  const { error } = await supabase.rpc('apply_employee_leave_opening', { p_code: code });
  if (error) throw error;
}

export async function setLeaveTracking(code: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('employees').update({ leave_tracking: enabled }).eq('code', code);
  if (error) throw error;
  if (enabled) await applyLeaveOpening(code);
}

export async function provisionEmployeeAccount(code: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>('provision-employee-account', {
    body: { employee_code: code },
  });
  if (error || data?.ok !== true) throw new Error(`Không thể tạo tài khoản cho ${code}.`);
}

export async function createEmployees(
  drafts: EmployeeDraft[],
  options: ProvisioningOptions
): Promise<CreateEmployeesResult> {
  await insertEmployees(drafts, options);

  const incompleteCodes: string[] = [];
  for (const draft of drafts) {
    const code = normalizeDraft(draft).code;
    try {
      if (options.trackLeave) await applyLeaveOpening(code);
      if (options.createAccount) await provisionEmployeeAccount(code);
    } catch {
      incompleteCodes.push(code);
    }
  }
  return { incompleteCodes };
}
