import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LockedSummary } from '@/features/closing/closingService';
import { formatHours, formatWorkDays } from '@/features/closing/closingRules';

interface ClosingSummaryTableProps {
  summaries: LockedSummary[];
  isLoading: boolean;
  isLocked: boolean;
}

const COLUMN_COUNT = 10;

export function ClosingSummaryTable({ summaries, isLoading, isLocked }: ClosingSummaryTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[#5C6670]">Mã NV</TableHead>
            <TableHead className="text-[#5C6670]">Tên nhân viên</TableHead>
            <TableHead className="text-[#5C6670]">Bộ phận</TableHead>
            <TableHead className="text-right text-[#5C6670]">Tổng công thực tế</TableHead>
            <TableHead className="text-right text-[#5C6670]">Tăng ca (OT đã duyệt)</TableHead>
            <TableHead className="text-right text-[#5C6670]">OFF</TableHead>
            <TableHead className="text-right text-[#5C6670]">P</TableHead>
            <TableHead className="text-right text-[#5C6670]">UP</TableHead>
            <TableHead className="text-[#5C6670]">Trạng thái chốt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                Đang tải tổng hợp công...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isLocked && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                Kỳ này chưa được chốt công. Bảng tổng hợp sẽ hiển thị sau khi xác nhận chốt công.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            isLocked &&
            summaries.map((summary) => (
              <TableRow key={summary.employeeCode}>
                <TableCell className="font-medium tabular-nums text-[#1F2A30]">{summary.employeeCode}</TableCell>
                <TableCell className="text-[#1F2A30]">{summary.fullName}</TableCell>
                <TableCell className="text-[#5C6670]">{summary.department}</TableCell>
                <TableCell className="text-right tabular-nums text-[#1F2A30]">
                  {formatWorkDays(summary.workDays)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-[#1F2A30]">
                  {summary.otHours > 0 ? formatHours(summary.otHours) : '--'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-[#1F2A30]">{summary.offDays}</TableCell>
                <TableCell className="text-right tabular-nums text-[#1F2A30]">{summary.pDays}</TableCell>
                <TableCell className="text-right tabular-nums text-[#1F2A30]">{summary.upDays}</TableCell>
                <TableCell>
                  <Badge className="gap-1 border-transparent bg-success/10 text-success hover:bg-success/10">
                    <Lock className="h-3 w-3" />
                    Đã khóa
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && isLocked && summaries.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                Không có nhân viên nào trong kỳ chốt này.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
