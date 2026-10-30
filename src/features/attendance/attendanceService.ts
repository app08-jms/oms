import { supabase } from '@/lib/supabase';
import type { AdjustmentReason } from '@/config/attendance';
import {
  toDateKey,
  type AdjustmentStatus,
  type AttendanceAdjustmentRequest,
  type AttendanceRecord,
  type AttendanceScope,
  type CheckInEvaluation,
  type DateRange,
  type GpsReading,
  type GpsStatus,
  type OvertimeStatus,
} from '@/features/attendance/attendanceRules';

interface AttendanceRow {
  id: string;
  hotel_id: string;
  app_user_system_uid: string;
  employee_code: string;
  shift_name: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string | null;
  adjustment_status: AdjustmentStatus | null;
  adjustment_reason: AdjustmentReason | null;
  adjustment_note: string | null;
  ot_status: OvertimeStatus | null;
  check_in_gps_status: GpsStatus | null;
  check_in_distance_m: number | null;
  check_out_gps_status: GpsStatus | null;
  check_out_distance_m: number | null;
  updated_at: string;
}

const COLUMNS = [
  'id',
  'hotel_id',
  'app_user_system_uid',
  'employee_code',
  'shift_name',
  'work_date',
  'check_in_at',
  'check_out_at',
  'adjustment_status',
  'adjustment_reason',
  'adjustment_note',
  'ot_status',
  'check_in_gps_status',
  'check_in_distance_m',
  'check_out_gps_status',
  'check_out_distance_m',
  'updated_at',
].join(', ');
const ADJUSTMENT_STATUSES: readonly string[] = ['pending', 'approved', 'rejected'];
const OVERTIME_STATUSES: readonly string[] = ['approved', 'rejected'];
const GPS_STATUSES: readonly string[] = ['valid', 'out-of-range'];
const LOAD_ERROR = 'Unexpected attendance data.';

function isNullableGpsStatus(value: unknown): boolean {
  return value === null || (typeof value === 'string' && GPS_STATUSES.includes(value));
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

function isAttendanceRow(value: unknown): value is AttendanceRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.hotel_id === 'string' &&
    typeof row.app_user_system_uid === 'string' &&
    typeof row.employee_code === 'string' &&
    typeof row.shift_name === 'string' &&
    typeof row.work_date === 'string' &&
    typeof row.check_in_at === 'string' &&
    typeof row.updated_at === 'string' &&
    (row.check_out_at === null || typeof row.check_out_at === 'string') &&
    (row.adjustment_status === null ||
      (typeof row.adjustment_status === 'string' && ADJUSTMENT_STATUSES.includes(row.adjustment_status))) &&
    (row.adjustment_reason === null || typeof row.adjustment_reason === 'string') &&
    (row.adjustment_note === null || typeof row.adjustment_note === 'string') &&
    (row.ot_status === null || (typeof row.ot_status === 'string' && OVERTIME_STATUSES.includes(row.ot_status))) &&
    isNullableGpsStatus(row.check_in_gps_status) &&
    isNullableNumber(row.check_in_distance_m) &&
    isNullableGpsStatus(row.check_out_gps_status) &&
    isNullableNumber(row.check_out_distance_m)
  );
}

function gpsFrom(status: GpsStatus | null, distanceM: number | null): GpsReading | null {
  return status && distanceM !== null ? { status, distanceM } : null;
}

function toRecord(row: unknown, employeeName: string | null): AttendanceRecord {
  if (!isAttendanceRow(row)) throw new Error(LOAD_ERROR);
  return {
    id: row.id,
    hotelId: row.hotel_id,
    appUserSystemUid: row.app_user_system_uid,
    employeeCode: row.employee_code,
    employeeName,
    shiftName: row.shift_name,
    workDate: row.work_date,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    adjustmentStatus: row.adjustment_status,
    adjustmentReason: row.adjustment_reason,
    adjustmentNote: row.adjustment_note,
    otStatus: row.ot_status,
    checkInGps: gpsFrom(row.check_in_gps_status, row.check_in_distance_m),
    checkOutGps: gpsFrom(row.check_out_gps_status, row.check_out_distance_m),
    updatedAt: row.updated_at,
  };
}

async function fetchEmployeeNames(codes: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (codes.length === 0) return names;
  const { data, error } = await supabase
    .from('employees')
    .select('code, full_name')
    .not('app_user_system_uid', 'is', null)
    .in('code', codes);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(LOAD_ERROR);
  for (const item of data as { code: unknown; full_name: unknown }[]) {
    if (typeof item.code === 'string' && typeof item.full_name === 'string') names.set(item.code, item.full_name);
  }
  return names;
}

async function fetchDepartmentEmployeeCodes(departments: string[]): Promise<string[]> {
  if (departments.length === 0) return [];
  const { data, error } = await supabase
    .from('employees')
    .select('code')
    .not('app_user_system_uid', 'is', null)
    .in('department', departments);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(LOAD_ERROR);
  return (data as { code: unknown }[]).flatMap((item) => (typeof item.code === 'string' ? [item.code] : []));
}

export async function fetchAttendanceHistory(
  hotelId: string,
  scope: AttendanceScope,
  range: DateRange,
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance_records')
    .select(COLUMNS)
    .eq('hotel_id', hotelId)
    .order('work_date', { ascending: false })
    .order('check_in_at', { ascending: false });

  if (scope.kind === 'self') {
    query = query.eq('app_user_system_uid', scope.systemUid);
  } else if (scope.kind === 'department') {
    const codes = await fetchDepartmentEmployeeCodes(scope.departments);
    if (codes.length === 0) return [];
    query = query.in('employee_code', codes);
  }
  if (range.from) query = query.gte('work_date', range.from);
  if (range.to) query = query.lte('work_date', range.to);

  const { data, error } = await query;
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(LOAD_ERROR);

  const codes = [...new Set(data.map((row) => (isAttendanceRow(row) ? row.employee_code : null)).filter((code): code is string => code !== null))];
  const names = await fetchEmployeeNames(codes);
  return data
    .filter((row) => isAttendanceRow(row) && names.has(row.employee_code))
    .map((row) => toRecord(row, isAttendanceRow(row) ? names.get(row.employee_code) ?? null : null));
}

export async function fetchOpenAttendanceRecord(hotelId: string, systemUid: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(COLUMNS)
    .eq('hotel_id', hotelId)
    .eq('app_user_system_uid', systemUid)
    .is('check_out_at', null)
    .maybeSingle();

  if (error) throw error;
  return data ? toRecord(data, null) : null;
}

export async function fetchTodayAttendanceRecord(
  hotelId: string,
  systemUid: string,
  workDate: string,
): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(COLUMNS)
    .eq('hotel_id', hotelId)
    .eq('app_user_system_uid', systemUid)
    .eq('work_date', workDate)
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toRecord(data, null) : null;
}

interface CheckInInput {
  hotelId: string;
  systemUid: string;
  employeeCode: string;
  evaluation: CheckInEvaluation;
  gps: GpsReading;
  adjustment: AttendanceAdjustmentRequest | null;
}

export async function insertCheckIn(input: CheckInInput): Promise<AttendanceRecord> {
  const { checkInAt, shift, scheduledStart } = input.evaluation;
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      hotel_id: input.hotelId,
      app_user_system_uid: input.systemUid,
      employee_code: input.employeeCode,
      shift_name: shift.name,
      work_date: toDateKey(checkInAt),
      check_in_at: checkInAt.toISOString(),
      check_in_gps_status: input.gps.status,
      check_in_distance_m: input.gps.distanceM,
      assigned_start_at: input.adjustment ? scheduledStart.toISOString() : null,
      adjustment_status: input.adjustment ? 'pending' : null,
      adjustment_reason: input.adjustment?.reason ?? null,
      adjustment_note: input.adjustment?.note ?? null,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toRecord(data, null);
}

export async function updateCheckOut(recordId: string, checkOutAt: Date, gps: GpsReading): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_at: checkOutAt.toISOString(),
      check_out_gps_status: gps.status,
      check_out_distance_m: gps.distanceM,
    })
    .eq('id', recordId)
    .is('check_out_at', null)
    .select(COLUMNS);

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) throw new Error('No open shift to check out from.');
  return toRecord(data[0], null);
}

export async function decideAttendanceAdjustment(recordId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase.rpc('decide_attendance_adjustment', {
    p_record_id: recordId,
    p_decision: decision,
  });

  if (error) throw error;
}
