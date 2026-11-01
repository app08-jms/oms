import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HotelRef } from '@/features/auth/authRules';
import type { RoleSummary } from '@/features/permissions/permissionRules';
import { type UserFilters } from '@/features/users/userRules';

interface UserFilterBarProps {
  filters: UserFilters;
  roles: RoleSummary[];
  hotels: HotelRef[];
  hotelLocked: boolean;
  onFiltersChange: (filters: UserFilters) => void;
}

const selectTriggerClass = 'h-10 w-full border-[#E2E8F0] bg-white sm:w-[200px]';

export function UserFilterBar({ filters, roles, hotels, hotelLocked, onFiltersChange }: UserFilterBarProps) {
  const lockedHotelName = hotels.find((hotel) => hotel.id === filters.hotelId)?.name ?? '';
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {hotelLocked ? (
          <Input
            readOnly
            aria-label="Khách sạn"
            value={lockedHotelName}
            className="h-10 w-full border-[#E2E8F0] bg-[#F8FAFC] text-[#1F2A30] sm:w-[260px]"
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

        <Select
          value={filters.role}
          onValueChange={(value) => onFiltersChange({ ...filters, role: value })}
        >
          <SelectTrigger aria-label="Vai trò" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.key} value={role.key}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as UserFilters['status'] })}
        >
          <SelectTrigger aria-label="Trạng thái tài khoản" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="locked">Đã khóa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative w-full lg:w-[360px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
        <Input
          type="search"
          aria-label="Tìm kiếm tài khoản"
          placeholder="Tìm kiếm theo Username, Họ tên, Mã NV..."
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          className="h-10 border-[#E2E8F0] bg-white pl-9"
        />
      </div>
    </div>
  );
}
