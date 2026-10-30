import { Fragment } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatClockTime, formatWorkDate, formatWorkedDuration } from '@/features/attendance/attendanceRules';
import { formatHours, formatShiftMultiplier, type ClosingRow, type PayrollAdjustment } from '@/features/closing/closingRules';
import { EmployeeCell } from '@/features/timesheet/components/EmployeeCell';
import { TIMESHEET_STATUS_META } from '@/features/timesheet/timesheetRules';
import { cn } from '@/lib/utils';

interface ClosingDetailTableProps {
  rows: ClosingRow[];
  isLoading: boolean;
  emptyMessage: string;
  isLocked: boolean;
  isAdjustMode: boolean;
  busyKey: string | null;
  onDecideOvertime: (recordId: string, decision: 'approved' | 'rejected') => void;
  onRequestAdjust: (row: ClosingRow) => void;
  onDecideAdjustment: (adjustmentId: string, decision: 'approved' | 'rejected') => void;
}

const COLUMN_COUNT = 8;

export function ClosingDetailTable({
  rows,
  isLoading,
  emptyMessage,
  isLocked,
  isAdjustMode,
  busyKey,
  onDecideOvertime,
  onRequestAdjust,
  onDecideAdjustment,
}: ClosingDetailTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[#5C6670]">Ngày / Ca</TableHead>
            <TableHead className="text-[#5C6670]">Nhân viên</TableHead>
            <TableHead className="text-[#5C6670]">Giờ vào / ra thực tế</TableHead>
            <TableHead className="text-[#5C6670]">Tổng giờ làm</TableHead>
            <TableHead className="text-[#5C6670]">Giờ OT & duyệt OT</TableHead>
            <TableHead className="text-[#5C6670]">Trạng thái</TableHead>
            <TableHead className="text-[#5C6670]">Điều chỉnh & lý do</TableHead>
            <TableHead className="text-right text-[#5C6670]">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                Đang tải bảng chốt công...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            rows.map((row) => {
              const { record, pendingAdjustment } = row;
              const statusMeta = TIMESHEET_STATUS_META[row.status];
              const isOtBusy = busyKey === `ot-${record.id}`;
              return (
                <Fragment key={record.id}>
                  <TableRow className={cn(pendingAdjustment && 'border-b-0')}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium tabular-nums text-[#1F2A30]">{formatWorkDate(record.workDate)}</span>
                        <Badge variant="outline" className="w-fit border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] tabular-nums">
                          [{record.shiftName} - {formatShiftMultiplier(row.workDays)}]
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EmployeeCell row={row} />
                    </TableCell>
                    <TableCell className="tabular-nums text-[#1F2A30]">
                      {formatClockTime(record.checkInAt)} / {record.checkOutAt ? formatClockTime(record.checkOutAt) : '--:--'}
                    </TableCell>
                    <TableCell className="tabular-nums text-[#1F2A30]">
                      {row.workedHours === null ? '--' : formatWorkedDuration(row.workedHours * 3_600_000)}
                    </TableCell>
                    <TableCell>
                      <OvertimeCell
                        row={row}
                        isLocked={isLocked}
                        isBusy={isOtBusy}
                        onDecide={(decision) => onDecideOvertime(record.id, decision)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-transparent hover:bg-transparent', statusMeta.className)}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <AdjustmentHistory adjustments={row.adjustments} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {isAdjustMode && !isLocked ? (
                          <Button size="sm" variant="outline" onClick={() => onRequestAdjust(row)} className="border-[#E2E8F0] bg-white">
                            Điều chỉnh
                          </Button>
                        ) : (
                          <span className="text-sm text-[#5C6670]">--</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {pendingAdjustment && (
                    <PendingAdjustmentRow
                      adjustment={pendingAdjustment}
                      isLocked={isLocked}
                      busyKey={busyKey}
                      onDecide={onDecideAdjustment}
                    />
                  )}
                </Fragment>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}

interface OvertimeCellProps {
  row: ClosingRow;
  isLocked: boolean;
  isBusy: boolean;
  onDecide: (decision: 'approved' | 'rejected') => void;
}

function OvertimeCell({ row, isLocked, isBusy, onDecide }: OvertimeCellProps) {
  if (row.otState === 'none') {
    return <span className="text-sm text-[#5C6670]">--</span>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span
        className={cn(
          'rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums',
          row.otState === 'approved' ? 'bg-success/10 text-success' : 'bg-pending/10 text-pending'
        )}
      >
        +{formatHours(row.otHours)} OT
      </span>
      {row.otState === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isLocked || isBusy}
            onClick={() => onDecide('approved')}
            className="h-8 bg-[#2F7A4B] px-3 text-white hover:bg-[#276640]"
          >
            <Check className="h-3.5 w-3.5" />
            Duyệt OT
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isLocked || isBusy}
            onClick={() => onDecide('rejected')}
            className="h-8 border-[#B4533C] px-3 text-[#B4533C] hover:bg-[#B4533C]/10 hover:text-[#B4533C]"
          >
            <X className="h-3.5 w-3.5" />
            Từ chối OT
          </Button>
        </div>
      )}
      {row.otState === 'approved' && <span className="text-xs text-success">Đã duyệt OT</span>}
      {row.otState === 'rejected' && <span className="text-xs text-error">Đã từ chối, tính theo ca chuẩn</span>}
    </div>
  );
}

function AdjustmentHistory({ adjustments }: { adjustments: PayrollAdjustment[] }) {
  const decided = adjustments.filter((item) => item.status !== 'pending');
  if (adjustments.length === 0) return <span className="text-sm text-[#5C6670]">--</span>;

  return (
    <ul className="flex flex-col gap-1">
      {adjustments.some((item) => item.status === 'pending') && (
        <li className="text-xs font-medium text-pending">Đang chờ duyệt điều chỉnh</li>
      )}
      {decided.map((item) => (
        <li key={item.id} className="text-sm text-[#1F2A30]">
          <span className={item.status === 'approved' ? 'font-medium text-success' : 'font-medium text-error'}>
            {item.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}:
          </span>{' '}
          <span className="line-clamp-1">{item.reason}</span>
        </li>
      ))}
    </ul>
  );
}

interface PendingAdjustmentRowProps {
  adjustment: PayrollAdjustment;
  isLocked: boolean;
  busyKey: string | null;
  onDecide: (adjustmentId: string, decision: 'approved' | 'rejected') => void;
}

function PendingAdjustmentRow({ adjustment, isLocked, busyKey, onDecide }: PendingAdjustmentRowProps) {
  const isBusy = busyKey === `adjustment-${adjustment.id}`;
  const proposedOut = adjustment.proposedCheckOutAt ? formatClockTime(adjustment.proposedCheckOutAt) : '--:--';

  return (
    <TableRow className="border-t border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#EFF6FF]">
      <TableCell colSpan={COLUMN_COUNT}>
        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 pl-2 text-sm">
            <span className="font-semibold text-[#1D4ED8]">Đề xuất điều chỉnh giờ vào / ra</span>
            <span className="tabular-nums text-[#1F2A30]">
              Vào {formatClockTime(adjustment.proposedCheckInAt)} • Ra {proposedOut}
            </span>
            <span className="text-[#5C6670]">Lý do: {adjustment.reason}</span>
          </div>
          <div className="flex gap-2 pr-2">
            <Button
              size="sm"
              disabled={isLocked || isBusy}
              onClick={() => onDecide(adjustment.id, 'approved')}
              className="bg-[#2F7A4B] text-white hover:bg-[#276640]"
            >
              <Check className="h-4 w-4" />
              Duyệt điều chỉnh
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLocked || isBusy}
              onClick={() => onDecide(adjustment.id, 'rejected')}
              className="border-[#B4533C] text-[#B4533C] hover:bg-[#B4533C]/10 hover:text-[#B4533C]"
            >
              <X className="h-4 w-4" />
              Từ chối điều chỉnh
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
