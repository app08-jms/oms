import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  calculateStandardHours,
  formatBreakMinutes,
  formatHeSoCong,
  formatShiftTime,
  formatStandardHours,
  type ShiftType,
} from '@/features/settings/settingsRules';
import { cn } from '@/lib/utils';

interface ShiftTableProps {
  rows: ShiftType[];
  isLoading: boolean;
  isSaving: boolean;
  onEdit: (shift: ShiftType) => void;
  onDelete: (shift: ShiftType) => void;
}

const COLUMN_COUNT = 9;
const HEAD_CLASS = 'whitespace-nowrap text-[#5C6670]';

export function ShiftTable({ rows, isLoading, isSaving, onEdit, onDelete }: ShiftTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn('w-[60px]', HEAD_CLASS)}>STT</TableHead>
              <TableHead className={HEAD_CLASS}>Mã ca</TableHead>
              <TableHead className={HEAD_CLASS}>Tên ca làm việc</TableHead>
              <TableHead className={HEAD_CLASS}>Trạng thái ca</TableHead>
              <TableHead className={HEAD_CLASS}>Thời gian làm việc</TableHead>
              <TableHead className={HEAD_CLASS}>Thời gian nghỉ</TableHead>
              <TableHead className={HEAD_CLASS}>Hệ số công</TableHead>
              <TableHead className={HEAD_CLASS}>Tổng giờ làm chuẩn</TableHead>
              <TableHead className={cn('text-right', HEAD_CLASS)}>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                  Đang tải danh sách ca làm việc...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                  Chưa có ca làm việc nào.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((shift, index) => {
                const breakMinutes = shift.isWorking ? shift.breakMinutes : 0;
                const hours = calculateStandardHours({
                  isWorking: shift.isWorking,
                  startTime: shift.startTime?.slice(0, 5) ?? '',
                  endTime: shift.endTime?.slice(0, 5) ?? '',
                  breakMinutes: String(breakMinutes),
                });
                return (
                  <TableRow key={shift.code} className="transition-colors duration-150 hover:bg-[#F8FAFC]">
                    <TableCell className="tabular-nums text-[#5C6670]">{index + 1}</TableCell>
                    <TableCell>
                      <Badge className="whitespace-nowrap border-[#4F7284]/30 bg-[#4F7284]/10 px-2.5 py-0.5 font-semibold text-[#4F7284] hover:bg-[#4F7284]/10">
                        {shift.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-[#1F2A30]">{shift.name}</TableCell>
                    <TableCell>
                      {shift.isWorking ? (
                        <Badge className="whitespace-nowrap border-transparent bg-success/10 px-2.5 py-0.5 font-medium text-success hover:bg-success/10">
                          Ngày làm việc
                        </Badge>
                      ) : (
                        <Badge className="whitespace-nowrap border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-0.5 font-medium text-[#5C6670] hover:bg-[#F1F5F9]">
                          Ngày nghỉ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-[#1F2A30]">
                      {shift.isWorking
                        ? `${formatShiftTime(shift.startTime)} - ${formatShiftTime(shift.endTime)}`
                        : '--:--'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-[#1F2A30]">
                      {formatBreakMinutes(breakMinutes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium tabular-nums text-[#1F2A30]">
                      {formatHeSoCong(shift.heSoCong)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium tabular-nums text-[#1F2A30]">
                      {formatStandardHours(hours)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Sửa ca ${shift.name}`}
                          disabled={isSaving}
                          onClick={() => onEdit(shift)}
                          className="h-8 w-8 text-[#4F7284] hover:bg-[#4F7284]/10 hover:text-[#3F5C6C]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Xóa ca ${shift.name}`}
                          disabled={isSaving}
                          onClick={() => onDelete(shift)}
                          className="h-8 w-8 text-[#5C6670] hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
