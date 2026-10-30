import { supabase } from '@/lib/supabase';
import type { AdjustmentStatus } from '@/features/attendance/attendanceRules';
import type { LockSnapshot, PayrollAdjustment } from '@/features/closing/closingRules';

export interface PayrollPeriod {
  status: 'reconciling' | 'locked';
  deadline: string | null;
  lockedAt: string | null;
}

export interface LockedSummary {
  employeeCode: string;
  fullName: string;
  department: string;
  creditedHours: number;
  workDays: number;
  completedShifts: number;
  otHours: number;
  offDays: number;
  pDays: number;
  upDays: number;
}

interface AdjustmentRow {
  id: string;
  attendance_record_id: string;
  employee_code: string;
  work_date: string;
  proposed_check_in_at: string;
  proposed_check_out_at: string | null;
  reason: string;
  status: AdjustmentStatus;
  created_at: string;
  decided_at: string | null;
}

interface PeriodRow {
  status: 'reconciling' | 'locked';
  deadline: string | null;
  locked_at: string | null;
}

interface SummaryRow {
  employee_code: string;
  full_name: string;
  department: string;
  credited_hours: number | string;
  work_days: number | string;
  ot_hours: number | string;
  off_days: number;
  p_days: number;
  up_days: number;
  completed_shifts: number;
}

function assertArray<T>(data: unknown): T[] {
  if (!Array.isArray(data)) throw new Error('Unexpected payroll data.');
  return data as T[];
}

function toAdjustment(row: AdjustmentRow): PayrollAdjustment {
  return {
    id: row.id,
    attendanceRecordId: row.attendance_record_id,
    employeeCode: row.employee_code,
    workDate: row.work_date,
    proposedCheckInAt: row.proposed_check_in_at,
    proposedCheckOutAt: row.proposed_check_out_at,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

export async function fetchPayrollPeriod(period: string): Promise<PayrollPeriod | null> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('status, deadline, locked_at')
    .eq('period_month', period)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as PeriodRow;
  return { status: row.status, deadline: row.deadline, lockedAt: row.locked_at };
}

export async function fetchPayrollAdjustments(from: string, to: string): Promise<PayrollAdjustment[]> {
  const { data, error } = await supabase
    .from('payroll_adjustments')
    .select(
      'id, attendance_record_id, employee_code, work_date, proposed_check_in_at, proposed_check_out_at, reason, status, created_at, decided_at'
    )
    .gte('work_date', from)
    .lte('work_date', to)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return assertArray<AdjustmentRow>(data).map(toAdjustment);
}

export async function fetchLockedSummaries(period: string): Promise<LockedSummary[]> {
  const { data, error } = await supabase
    .from('payroll_locked_summaries')
    .select('employee_code, full_name, department, credited_hours, work_days, ot_hours, off_days, p_days, up_days, completed_shifts')
    .eq('period_month', period)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return assertArray<SummaryRow>(data).map((row) => ({
    employeeCode: row.employee_code,
    fullName: row.full_name,
    department: row.department,
    creditedHours: Number(row.credited_hours),
    workDays: Number(row.work_days),
    otHours: Number(row.ot_hours),
    offDays: row.off_days,
    pDays: row.p_days,
    upDays: row.up_days,
    completedShifts: row.completed_shifts,
  }));
}

export async function saveDeadline(period: string, deadline: string | null): Promise<void> {
  const { error } = await supabase.rpc('save_payroll_deadline', { p_period: period, p_deadline: deadline });
  if (error) throw error;
}

export async function requestAdjustment(
  recordId: string,
  checkInAt: string,
  checkOutAt: string | null,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('request_payroll_adjustment', {
    p_record_id: recordId,
    p_check_in_at: checkInAt,
    p_check_out_at: checkOutAt,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function decideAdjustment(adjustmentId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase.rpc('decide_payroll_adjustment', {
    p_adjustment_id: adjustmentId,
    p_decision: decision,
  });
  if (error) throw error;
}

export async function decideOvertime(recordId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase.rpc('decide_overtime', { p_record_id: recordId, p_decision: decision });
  if (error) throw error;
}

export async function lockPeriod(period: string, snapshots: LockSnapshot[]): Promise<void> {
  const { error } = await supabase.rpc('lock_payroll_period', { p_period: period, p_rows: snapshots });
  if (error) throw error;
}
