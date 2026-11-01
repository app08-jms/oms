import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HotelRef } from '@/features/auth/authRules';
import {
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  FILTER_DEPARTMENTS,
  type AccountFilter,
  type EmployeeFilters,
  type EmploymentStatus,
} from '@/features/employees/employeeRules';

interface EmployeeFilterBarProps {
  filters: EmployeeFilters;
  hotels: HotelRef[];
  hotelLocked: boolean;
  onFiltersChange: (filters: EmployeeFilters) => void;
}

const ACCOUNT_OPTIONS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'linked', label: 'Đã có tài khoản' },
  { value: 'unlinked', label: 'Chưa tạo tài khoản' },
];

const selectTriggerClass = 'h-10 w-full border-[#E2E8F0] bg-white sm:w-[200px]';

export function EmployeeFilterBar({ filters, hotels, hotelLocked, onFiltersChange }: EmployeeFilterBarProps) {
  const lockedHotelName = hotels.find((hotel) => hotel.id === filters.hotelId)?.name ?? '';
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {hotelLocked ? (
          <Input
            readOnly
            aria-label="Khách sạn"
            value={lockedHotelName}
            className={`${selectTriggerClass} bg-[#F8FAFC] text-[#1F2A30]`}
          />
        ) : (
          <Select value={filters.hotelId} onValueChange={(value) => onFiltersChange({ ...filters, hotelId: value })}>
            <SelectTrigger aria-label="Lọc theo khách sạn" className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khách sạn</SelectItem>
              {hotels.map((hotel) => (
                <SelectItem key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filters.department} onValueChange={(value) => onFiltersChange({ ...filters, department: value })}>
          <SelectTrigger aria-label="Bộ phận" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bộ phận</SelectItem>
            {FILTER_DEPARTMENTS.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.account}
          onValueChange={(value) => onFiltersChange({ ...filters, account: value as AccountFilter })}
        >
          <SelectTrigger aria-label="Trạng thái tài khoản" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.employmentStatus}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, employmentStatus: value as EmployeeFilters['employmentStatus'] })
          }
        >
          <SelectTrigger aria-label="Trạng thái làm việc" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {EMPLOYMENT_STATUSES.map((status: EmploymentStatus) => (
              <SelectItem key={status} value={status}>
                {EMPLOYMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative w-full lg:w-[360px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
        <Input
          type="search"
          aria-label="Tìm kiếm nhân viên"
          placeholder="Tìm kiếm theo tên, mã NV, CCCD, SĐT, Email..."
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          className="h-10 border-[#E2E8F0] bg-white pl-9"
        />
      </div>
    </div>
  );
}
