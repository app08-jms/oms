import { ChevronDown, KeyRound, Link2, Link2Off, Pencil, ShieldCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ROLE_TONE_BADGE_CLASS, type RoleSummary } from '@/features/permissions/permissionRules';
import type { UserAccountRow } from '@/features/users/userRules';

interface UserTableProps {
  rows: UserAccountRow[];
  roles: RoleSummary[];
  hasAnyAccounts: boolean;
  isBusy: boolean;
  onEditDetails: (row: UserAccountRow) => void;
  onLinkProfile: (row: UserAccountRow) => void;
  onUnlinkProfile: (row: UserAccountRow) => void;
  onManageCredentials: (row: UserAccountRow) => void;
  onOverridePermissions: (row: UserAccountRow) => void;
}

const HEAD_CLASS = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C6670]';
const CELL_CLASS = 'px-4 py-3 align-middle text-sm text-[#1F2A30]';
const BADGE_BASE = 'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium';
const MENU_ITEM_CLASS = 'cursor-pointer gap-2 text-sm text-[#1F2A30] focus:bg-[#4F7284]/10 focus:text-[#3D5B69]';

export function UserTable({
  rows,
  roles,
  hasAnyAccounts,
  isBusy,
  onEditDetails,
  onLinkProfile,
  onUnlinkProfile,
  onManageCredentials,
  onOverridePermissions,
}: UserTableProps) {
  const roleByKey = new Map(roles.map((role) => [role.key, role]));
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E2E8F0]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th scope="col" className={HEAD_CLASS}>STT</th>
              <th scope="col" className={HEAD_CLASS}>Username</th>
              <th scope="col" className={HEAD_CLASS}>Họ và tên</th>
              <th scope="col" className={HEAD_CLASS}>Bộ phận</th>
              <th scope="col" className={HEAD_CLASS}>Vai trò</th>
              <th scope="col" className={HEAD_CLASS}>Trạng thái</th>
              <th scope="col" className={HEAD_CLASS}>Liên kết hồ sơ</th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#5C6670]">
                  {hasAnyAccounts ? 'Không có tài khoản phù hợp với bộ lọc.' : 'Chưa có tài khoản nào.'}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.systemUid} className="transition-colors duration-150 hover:bg-[#F8FAFC]">
                <td className={`${CELL_CLASS} text-[#5C6670]`}>{index + 1}</td>
                <td className={`${CELL_CLASS} font-medium`}>{row.username}</td>
                <td className={CELL_CLASS}>{row.fullName}</td>
                <td className={`${CELL_CLASS} text-[#5C6670]`}>{row.employee?.department ?? '—'}</td>
                <td className={CELL_CLASS}>
                  <span className={`${BADGE_BASE} ${ROLE_TONE_BADGE_CLASS[roleByKey.get(row.role)?.tone ?? 'slate']}`}>
                    {roleByKey.get(row.role)?.name ?? row.role}
                  </span>
                </td>
                <td className={CELL_CLASS}>
                  {row.isActive ? (
                    <span className={`${BADGE_BASE} border-emerald-200 bg-emerald-50 text-emerald-700`}>Hoạt động</span>
                  ) : (
                    <span className={`${BADGE_BASE} border-red-200 bg-red-50 text-red-700`}>Đã khóa</span>
                  )}
                </td>
                <td className={CELL_CLASS}>
                  {row.employee ? (
                    <span className={`${BADGE_BASE} border-[#4F7284]/20 bg-[#4F7284]/10 text-[#3D5B69]`}>
                      {row.employee.code} - {row.employee.fullName}
                    </span>
                  ) : (
                    <span className="text-sm text-[#5C6670]">Chưa liên kết</span>
                  )}
                </td>
                <td className={CELL_CLASS}>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={isBusy}
                          aria-label={`Thao tác với ${row.username}`}
                          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#E2E8F0] bg-[#F1F5F9] px-3 text-sm font-medium text-[#334155] shadow-sm transition-colors duration-150 hover:border-[#4F7284]/40 hover:bg-[#4F7284]/10 hover:text-[#3D5B69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7284] disabled:pointer-events-none disabled:opacity-50 data-[state=open]:border-[#4F7284]/40 data-[state=open]:bg-[#4F7284]/10 data-[state=open]:text-[#3D5B69]"
                        >
                          Thao tác
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 border-[#E2E8F0] bg-white">
                        <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onEditDetails(row)}>
                          <Pencil className="h-4 w-4 text-[#4F7284]" aria-hidden="true" />
                          Chỉnh sửa thông tin
                        </DropdownMenuItem>
                        {row.employee ? (
                          <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onUnlinkProfile(row)}>
                            <Link2Off className="h-4 w-4 text-[#4F7284]" aria-hidden="true" />
                            Hủy liên kết hồ sơ
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onLinkProfile(row)}>
                            <Link2 className="h-4 w-4 text-[#4F7284]" aria-hidden="true" />
                            Liên kết hồ sơ nhân viên
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onManageCredentials(row)}>
                          <KeyRound className="h-4 w-4 text-[#4F7284]" aria-hidden="true" />
                          Đổi mật khẩu / Khóa tài khoản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onOverridePermissions(row)}>
                          <ShieldCheck className="h-4 w-4 text-[#4F7284]" aria-hidden="true" />
                          Phân quyền riêng
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
