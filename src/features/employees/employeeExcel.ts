import * as XLSX from 'xlsx';
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUSES,
  createEmptyDraft,
  normalizeDraft,
  validateDraft,
  type EmployeeDraft,
  type EmploymentStatus,
} from '@/features/employees/employeeRules';

const STATUS_HEADER = 'Trạng thái làm việc';

const COLUMNS: { key: keyof EmployeeDraft; header: string }[] = [
  { key: 'code', header: 'Mã NV' },
  { key: 'fullName', header: 'Họ và tên' },
  { key: 'displayName', header: 'Tên hiển thị' },
  { key: 'department', header: 'Bộ phận' },
  { key: 'position', header: 'Chức vụ' },
  { key: 'probationDate', header: 'Ngày thử việc' },
  { key: 'officialDate', header: 'Ngày chính thức' },
  { key: 'employmentStatus', header: STATUS_HEADER },
  { key: 'phone', header: 'SĐT' },
  { key: 'email', header: 'Email' },
];

const SAMPLE_ROW = ['NV010', 'Nguyễn Văn Mẫu', 'Văn Mẫu', 'Lễ tân', 'Nhân viên lễ tân', '01/11/2026', '', EMPLOYMENT_STATUS_LABELS.probation, '0900000000', 'mau@example.com'];

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportParseResult {
  drafts: EmployeeDraft[];
  errors: ImportRowError[];
}

export function downloadEmployeeTemplate(): void {
  const headers = COLUMNS.map((column) => column.header);
  const sheet = XLSX.utils.aoa_to_sheet([headers, SAMPLE_ROW]);
  sheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Hồ sơ nhân viên');
  XLSX.writeFile(workbook, 'mau-ho-so-nhan-vien.xlsx');
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseSpreadsheetDate(value: unknown): string | null {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return buildIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  const text = String(value).trim();
  if (!text) return '';
  const dayFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (dayFirst) return buildIsoDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (isoDate) return buildIsoDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  return null;
}

function parseEmploymentStatus(value: unknown): EmploymentStatus | null {
  const text = String(value ?? '').trim();
  if (!text) return 'probation';
  return EMPLOYMENT_STATUSES.find((status) => EMPLOYMENT_STATUS_LABELS[status] === text) ?? null;
}

export async function parseEmployeeWorkbook(file: File, hotelId: string): Promise<ImportParseResult> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
  if (!sheet) throw new Error('File không có dữ liệu.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const drafts: EmployeeDraft[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((raw, index) => {
    const row = index + 2;
    const isBlank = COLUMNS.every((column) => String(raw[column.header] ?? '').trim() === '');
    if (isBlank) return;

    const draft = createEmptyDraft(hotelId);
    for (const column of COLUMNS) {
      const value = raw[column.header];
      if (column.key === 'probationDate' || column.key === 'officialDate') {
        const isoDate = parseSpreadsheetDate(value);
        if (isoDate === null) {
          errors.push({ row, message: `${column.header} không đúng định dạng (dd/mm/yyyy).` });
          return;
        }
        draft[column.key] = isoDate;
      } else if (column.key === 'employmentStatus') {
        const status = parseEmploymentStatus(value);
        if (status === null) {
          errors.push({ row, message: `${STATUS_HEADER} không hợp lệ (Thử việc, Làm việc chính thức hoặc Nghỉ việc).` });
          return;
        }
        draft.employmentStatus = status;
      } else {
        draft[column.key] = String(value ?? '');
      }
    }

    const normalized = normalizeDraft(draft);
    const message = validateDraft(normalized);
    if (message) {
      errors.push({ row, message });
      return;
    }
    if (seenCodes.has(normalized.code)) {
      errors.push({ row, message: `Mã NV ${normalized.code} bị trùng trong file.` });
      return;
    }
    seenCodes.add(normalized.code);
    drafts.push(normalized);
  });

  return { drafts, errors };
}
