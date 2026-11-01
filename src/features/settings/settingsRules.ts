export interface Department {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Position {
  id: string;
  departmentId: string;
  name: string;
}

export const HE_SO_CONG_OPTIONS = [0, 0.5, 1, 1.5, 2, 3] as const;

export const SHIFT_DAY_STATUSES = ['workday', 'off', 'annual_leave', 'compensatory_leave'] as const;
export type ShiftDayStatus = (typeof SHIFT_DAY_STATUSES)[number];

export const SHIFT_DAY_STATUS_LABELS: Record<ShiftDayStatus, string> = {
  workday: 'Ngày làm việc',
  off: 'Ngày nghỉ',
  annual_leave: 'Nghỉ phép',
  compensatory_leave: 'Nghỉ bù',
};

export function isLeaveDayStatus(status: ShiftDayStatus): boolean {
  return status === 'annual_leave' || status === 'compensatory_leave';
}

export function defaultHeSoCongForStatus(status: ShiftDayStatus): string {
  return status === 'off' ? '0' : '1';
}

export interface ShiftType {
  code: string;
  name: string;
  dayStatus: ShiftDayStatus;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  heSoCong: number;
  sortOrder: number;
}

export interface ShiftDraft {
  code: string;
  name: string;
  dayStatus: ShiftDayStatus;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  heSoCong: string;
}

export const MAX_NAME_LENGTH = 80;
const SHIFT_CODE_PATTERN = /^[A-Z0-9]{1,10}$/;
const MINUTES_PER_DAY = 24 * 60;
const MAX_BREAK_MINUTES = 720;

export function createEmptyShiftDraft(): ShiftDraft {
  return { code: '', name: '', dayStatus: 'workday', startTime: '08:00', endTime: '17:00', breakMinutes: '60', heSoCong: '1' };
}

export function shiftDraftFromType(shift: ShiftType): ShiftDraft {
  return {
    code: shift.code,
    name: shift.name,
    dayStatus: shift.dayStatus,
    startTime: shift.startTime ?? '',
    endTime: shift.endTime ?? '',
    breakMinutes: String(shift.breakMinutes),
    heSoCong: String(shift.heSoCong),
  };
}

export function formatHeSoCong(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function normalizeShiftDraft(draft: ShiftDraft): ShiftDraft {
  const isWorking = draft.dayStatus === 'workday';
  return {
    ...draft,
    code: draft.code.trim().toUpperCase(),
    name: draft.name.trim(),
    startTime: isWorking ? draft.startTime : '',
    endTime: isWorking ? draft.endTime : '',
    breakMinutes: isWorking ? draft.breakMinutes.trim() : '0',
    heSoCong: isLeaveDayStatus(draft.dayStatus) ? '1' : draft.heSoCong,
  };
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function parseBreakMinutes(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value);
}

export function calculateStandardHours(draft: Pick<ShiftDraft, 'dayStatus' | 'startTime' | 'endTime' | 'breakMinutes'>): number {
  if (draft.dayStatus !== 'workday' || !draft.startTime || !draft.endTime) return 0;
  const breakMinutes = parseBreakMinutes(draft.breakMinutes) ?? 0;
  let span = toMinutes(draft.endTime) - toMinutes(draft.startTime);
  if (span <= 0) span += MINUTES_PER_DAY;
  return Math.max(0, Math.round(((span - breakMinutes) / 60) * 10) / 10);
}

export function formatStandardHours(hours: number): string {
  return `${hours.toFixed(1)} giờ`;
}

export function formatBreakMinutes(minutes: number): string {
  return `${minutes} phút`;
}

export function formatShiftTime(time: string | null): string {
  return time ? time.slice(0, 5) : '--:--';
}

export function validateDepartmentName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Vui lòng nhập tên bộ phận.';
  if (value.length > MAX_NAME_LENGTH) return `Tên bộ phận tối đa ${MAX_NAME_LENGTH} ký tự.`;
  return null;
}

export function validatePositionName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Vui lòng nhập tên chức vụ.';
  if (value.length > MAX_NAME_LENGTH) return `Tên chức vụ tối đa ${MAX_NAME_LENGTH} ký tự.`;
  return null;
}

export function validateShiftDraft(draft: ShiftDraft, takenCodes: Set<string>, isEdit: boolean): string | null {
  const normalized = normalizeShiftDraft(draft);
  if (!normalized.code) return 'Vui lòng nhập mã ca.';
  if (!SHIFT_CODE_PATTERN.test(normalized.code)) {
    return 'Mã ca chỉ gồm chữ cái không dấu và số, tối đa 10 ký tự.';
  }
  if (!isEdit && takenCodes.has(normalized.code)) return 'Mã ca này đã tồn tại.';
  if (!normalized.name) return 'Vui lòng nhập tên ca.';
  if (normalized.name.length > MAX_NAME_LENGTH) return `Tên ca tối đa ${MAX_NAME_LENGTH} ký tự.`;

  const breakMinutes = parseBreakMinutes(normalized.breakMinutes);
  if (breakMinutes === null || breakMinutes > MAX_BREAK_MINUTES) {
    return `Thời gian nghỉ giữa ca phải là số phút từ 0 đến ${MAX_BREAK_MINUTES}.`;
  }

  const heSoCong = Number(normalized.heSoCong);
  if (!(HE_SO_CONG_OPTIONS as readonly number[]).includes(heSoCong)) {
    return 'Hệ số công phải là 0, 0.5, 1, 1.5, 2 hoặc 3.';
  }

  if (normalized.dayStatus === 'workday') {
    if (!normalized.startTime || !normalized.endTime) return 'Vui lòng chọn giờ bắt đầu và giờ kết thúc.';
    if (normalized.startTime === normalized.endTime) return 'Giờ bắt đầu và giờ kết thúc không được trùng nhau.';
    const span = toMinutes(normalized.endTime) - toMinutes(normalized.startTime);
    const worked = (span <= 0 ? span + MINUTES_PER_DAY : span) - breakMinutes;
    if (worked <= 0) return 'Thời gian nghỉ giữa ca phải ngắn hơn tổng thời gian ca.';
  }
  return null;
}
