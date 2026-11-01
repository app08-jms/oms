import { useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HotelRef } from '@/features/auth/authRules';
import type { EmployeeDraft } from '@/features/employees/employeeRules';
import { parseEmployeeWorkbook } from '@/features/employees/employeeExcel';

interface EmployeeImportDialogProps {
  takenCodes: Set<string>;
  hotels: HotelRef[];
  hotelLocked: boolean;
  defaultHotelId: string;
  onCancel: () => void;
  onReady: (drafts: EmployeeDraft[]) => void;
}

interface ParsedImport {
  fileName: string;
  importable: EmployeeDraft[];
  issues: string[];
}

const MAX_SHOWN_ISSUES = 5;

export function EmployeeImportDialog({
  takenCodes,
  hotels,
  hotelLocked,
  defaultHotelId,
  onCancel,
  onReady,
}: EmployeeImportDialogProps) {
  const [hotelId, setHotelId] = useState(defaultHotelId);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const lockedHotelName = hotels.find((hotel) => hotel.id === defaultHotelId)?.name ?? '';

  function handleHotelChange(nextHotelId: string) {
    setHotelId(nextHotelId);
    setParsed(null);
  }

  async function handleFileChange(file: File | undefined) {
    if (!file || !hotelId) return;
    setIsParsing(true);
    setReadError(null);
    try {
      const result = await parseEmployeeWorkbook(file, hotelId);
      const importable: EmployeeDraft[] = [];
      const issues = result.errors.map((error) => `Dòng ${error.row}: ${error.message}`);
      result.drafts.forEach((draft) => {
        if (takenCodes.has(draft.code)) {
          issues.push(`Mã NV ${draft.code} đã có trong danh sách, sẽ bỏ qua.`);
        } else {
          importable.push(draft);
        }
      });
      setParsed({ fileName: file.name, importable, issues });
    } catch {
      setParsed(null);
      setReadError('Không đọc được file. Vui lòng dùng file .xlsx đúng mẫu.');
    } finally {
      setIsParsing(false);
    }
  }

  const shownIssues = parsed?.issues.slice(0, MAX_SHOWN_ISSUES) ?? [];
  const hiddenIssueCount = (parsed?.issues.length ?? 0) - shownIssues.length;

  return (
    <Dialog open onOpenChange={(open) => !open && !isParsing && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-lg sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">Nhập danh sách từ Excel</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Chọn file .xlsx theo mẫu. Dòng đầu tiên là tiêu đề cột, mỗi dòng tiếp theo là một nhân viên.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#1F2A30]">Khách sạn</span>
            {hotelLocked ? (
              <Input readOnly aria-label="Khách sạn" value={lockedHotelName} className="h-10 border-[#E2E8F0] bg-[#F8FAFC] text-[#1F2A30]" />
            ) : (
              <Select value={hotelId} onValueChange={handleHotelChange} disabled={isParsing}>
                <SelectTrigger aria-label="Khách sạn" className="h-10 w-full border-[#E2E8F0] bg-white">
                  <SelectValue placeholder="Chọn khách sạn" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-[#4F7284]/50 bg-[#F8FAFC] px-6 py-8 text-center transition-colors duration-200 hover:border-[#4F7284] hover:bg-[#4F7284]/5">
            {isParsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#4F7284]" />
            ) : (
              <Upload className="h-8 w-8 text-[#4F7284]" />
            )}
            <span className="text-sm font-medium text-[#1F2A30]">
              {parsed ? 'Chọn file khác' : 'Chọn file Excel (.xlsx)'}
            </span>
            <span className="text-xs text-[#5C6670]">Mã NV, Họ và tên và Bộ phận là bắt buộc</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              aria-label="Chọn file Excel"
              disabled={isParsing || !hotelId}
              className="sr-only"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>

          {readError && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {readError}
            </p>
          )}

          {parsed && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#4F7284]" />
                <span className="truncate text-sm font-medium text-[#1F2A30]">{parsed.fileName}</span>
              </div>
              <p className="text-sm text-[#1F2A30]">
                Sẵn sàng nhập <span className="font-semibold tabular-nums">{parsed.importable.length}</span> nhân viên.
              </p>
              {parsed.issues.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm text-[#5C6670]">
                  {shownIssues.map((issue, index) => (
                    <li key={`${index}-${issue}`}>{issue}</li>
                  ))}
                  {hiddenIssueCount > 0 && <li>Và {hiddenIssueCount} dòng khác cần kiểm tra.</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isParsing}
            className="border-[#E2E8F0] text-[#1F2A30]"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => parsed && onReady(parsed.importable)}
            disabled={isParsing || !parsed || parsed.importable.length === 0}
            className="bg-[#4F7284] text-white hover:bg-[#3F5C6C]"
          >
            Tiếp tục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
