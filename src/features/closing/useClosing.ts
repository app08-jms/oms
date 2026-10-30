import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAttendanceHistory } from '@/features/attendance/attendanceService';
import type { AttendanceRecord } from '@/features/attendance/attendanceRules';
import { useSession } from '@/features/auth/AuthProvider';
import { useHotelSettings } from '@/features/hotel/HotelSettingsProvider';
import {
  applyClosingFilters,
  buildClosingKpis,
  buildClosingRows,
  buildLockSnapshots,
  buildShiftMultiplierMap,
  getPeriodRange,
  type ClosingFilters,
  type ClosingRow,
  type PayrollAdjustment,
} from '@/features/closing/closingRules';
import {
  decideAdjustment,
  decideOvertime,
  fetchLockedSummaries,
  fetchPayrollAdjustments,
  fetchPayrollPeriod,
  lockPeriod,
  requestAdjustment,
  saveDeadline,
  type LockedSummary,
  type PayrollPeriod,
} from '@/features/closing/closingService';
import { fetchEmployees, fetchSchedules } from '@/features/schedule/scheduleService';
import type { Employee, ScheduleEntry } from '@/features/schedule/scheduleRules';
import { fetchShiftTypes } from '@/features/settings/settingsService';
import type { ShiftType } from '@/features/settings/settingsRules';

const RECONCILING: PayrollPeriod = { status: 'reconciling', deadline: null, lockedAt: null };

interface PeriodData {
  records: AttendanceRecord[];
  employees: Employee[];
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  adjustments: PayrollAdjustment[];
  period: PayrollPeriod;
  summaries: LockedSummary[];
}

export function useClosing(period: string, filters: ClosingFilters) {
  const { settings } = useHotelSettings();
  const standardShiftHours = settings.standardShiftHours;
  const [data, setData] = useState<PeriodData | null>(null);
  const hotelId = useSession().hotel.id;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const range = getPeriodRange(period);
    try {
      const [records, employees, schedules, shiftTypes, adjustments, payrollPeriod, summaries] = await Promise.all([
        fetchAttendanceHistory(hotelId, { kind: 'hotel' }, range),
        fetchEmployees(),
        fetchSchedules(range.from ?? period, range.to ?? period),
        fetchShiftTypes(),
        fetchPayrollAdjustments(range.from ?? period, range.to ?? period),
        fetchPayrollPeriod(period),
        fetchLockedSummaries(period),
      ]);
      setData({
        records,
        employees,
        schedules,
        shiftTypes,
        adjustments,
        period: payrollPeriod ?? RECONCILING,
        summaries,
      });
      setLoadError(null);
    } catch {
      setLoadError('Không thể tải dữ liệu chốt công. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allRows = useMemo(
    () =>
      data
        ? buildClosingRows(
            data.records,
            data.employees,
            data.adjustments,
            standardShiftHours,
            buildShiftMultiplierMap(data.schedules, data.shiftTypes)
          )
        : null,
    [data, standardShiftHours]
  );

  const fullKpis = useMemo(
    () => (allRows && data ? buildClosingKpis(allRows, data.schedules) : null),
    [allRows, data]
  );

  const visible = useMemo(
    () =>
      allRows && data ? applyClosingFilters(allRows, data.schedules, data.employees, filters) : null,
    [allRows, data, filters]
  );

  const kpis = useMemo(
    () => (visible ? buildClosingKpis(visible.rows, visible.schedules) : null),
    [visible]
  );

  const isLocked = data?.period.status === 'locked';
  const blockerCount = (fullKpis?.pendingOtCount ?? 0) + (fullKpis?.pendingAdjustmentCount ?? 0);

  async function run(key: string, action: () => Promise<void>): Promise<boolean> {
    setBusyKey(key);
    setActionError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      setActionError(readableError(error));
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  return {
    rows: visible?.rows ?? [],
    totalRowCount: allRows?.length ?? 0,
    kpis,
    summaries: data?.summaries ?? [],
    period: data?.period ?? RECONCILING,
    isLocked: Boolean(isLocked),
    isLoading,
    loadError,
    actionError,
    busyKey,
    blockerCount,
    canLock: blockerCount === 0 && fullKpis !== null,
    setDeadline: (deadline: string | null) => run('deadline', () => saveDeadline(period, deadline)),
    decideOvertime: (recordId: string, decision: 'approved' | 'rejected') =>
      run(`ot-${recordId}`, () => decideOvertime(recordId, decision)),
    requestAdjustment: (recordId: string, checkInAt: string, checkOutAt: string | null, reason: string) =>
      run(`request-${recordId}`, () => requestAdjustment(recordId, checkInAt, checkOutAt, reason)),
    decideAdjustment: (adjustmentId: string, decision: 'approved' | 'rejected') =>
      run(`adjustment-${adjustmentId}`, () => decideAdjustment(adjustmentId, decision)),
    lock: () => {
      if (!data) return Promise.resolve(false);
      const snapshots = buildLockSnapshots(data.employees, allRows ?? [], data.schedules);
      return run('lock', () => lockPeriod(period, snapshots));
    },
  };
}

function readableError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
