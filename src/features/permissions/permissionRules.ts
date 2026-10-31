export const PERMISSION_ACTIONS = ['view', 'edit', 'approve', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Quyền Xem',
  edit: 'Quyền Chỉnh Sửa',
  approve: 'Quyền Duyệt',
  delete: 'Quyền Xóa',
};

export const PERMISSION_FEATURES = [
  {
    key: 'attendance',
    name: 'Chấm công hàng ngày',
    note: 'Nhân viên: tự check-in và gửi yêu cầu. Quản lý: duyệt, từ chối, xóa.',
  },
  {
    key: 'schedule',
    name: 'Lịch làm việc',
    note: 'Nhân viên: chỉ xem. Quản lý: tạo, sửa, xóa ca.',
  },
  {
    key: 'timesheet',
    name: 'Bảng chấm công',
    note: 'Nhân viên: chỉ xem. Quản lý: sửa, duyệt, xóa.',
  },
  {
    key: 'closing',
    name: 'Chốt công',
    note: 'Quản lý: duyệt tăng ca, khóa dữ liệu, xuất PDF.',
  },
  {
    key: 'leave',
    name: 'Sổ phép',
    note: 'Nhân viên: xem số dư. Quản lý: điều chỉnh số dư, chuyển năm.',
  },
  {
    key: 'employees',
    name: 'Hồ sơ nhân viên',
    note: 'Quản lý: tạo, nhập Excel, sửa, xóa hồ sơ.',
  },
  {
    key: 'system',
    name: 'Cấu hình & Hệ thống',
    note: 'Chỉ Admin và Super Admin.',
  },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  note: string;
}>;

export type FeatureKey = (typeof PERMISSION_FEATURES)[number]['key'];

export type PermissionGrid = Record<FeatureKey, Record<PermissionAction, boolean>>;

export type OverrideMap = Partial<Record<string, 'grant' | 'revoke'>>;

export function overrideKey(feature: FeatureKey, action: PermissionAction): string {
  return `${feature}:${action}`;
}

export function emptyPermissionGrid(): PermissionGrid {
  const grid = {} as PermissionGrid;
  for (const feature of PERMISSION_FEATURES) {
    grid[feature.key] = { view: false, edit: false, approve: false, delete: false };
  }
  return grid;
}

export function applyOverrides(inherited: PermissionGrid, overrides: OverrideMap): PermissionGrid {
  const grid = emptyPermissionGrid();
  for (const feature of PERMISSION_FEATURES) {
    for (const action of PERMISSION_ACTIONS) {
      const override = overrides[overrideKey(feature.key, action)];
      grid[feature.key][action] = override ? override === 'grant' : inherited[feature.key][action];
    }
  }
  return grid;
}

export type RoleTone = 'red' | 'blue' | 'yellow' | 'green' | 'slate';

export const ROLE_TONE_BADGE_CLASS: Record<RoleTone, string> = {
  red: 'border-red-200 bg-red-50 text-red-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const ROLE_TONES: RoleTone[] = ['red', 'blue', 'yellow', 'green', 'slate'];

export const ROLE_TONE_LABELS: Record<RoleTone, string> = {
  red: 'Đỏ',
  blue: 'Xanh dương',
  yellow: 'Vàng',
  green: 'Xanh lá',
  slate: 'Xám',
};

export type DataScope = 'self' | 'department' | 'hotel';

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  self: 'Cá nhân',
  department: 'Theo bộ phận',
  hotel: 'Toàn khách sạn',
};

export interface RoleSummary {
  key: string;
  name: string;
  description: string;
  tone: RoleTone;
  dataScope: DataScope;
  departments: string[];
  userCount: number;
}

export const SUPER_ADMIN_ROLE_KEY = 'super_admin';

export function canViewerSeeRole(viewerRoleKey: string, roleKey: string): boolean {
  return viewerRoleKey === SUPER_ADMIN_ROLE_KEY || roleKey !== SUPER_ADMIN_ROLE_KEY;
}

export function filterRolesForViewer(roles: RoleSummary[], viewerRoleKey: string): RoleSummary[] {
  return roles.filter((role) => canViewerSeeRole(viewerRoleKey, role.key));
}

export function validateRoleName(name: string, existingNames: string[], currentName?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Vui lòng nhập tên vai trò.';
  if (trimmed.length > 40) return 'Tên vai trò tối đa 40 ký tự.';
  const lower = trimmed.toLowerCase();
  if (lower !== currentName?.toLowerCase() && existingNames.some((item) => item.toLowerCase() === lower)) {
    return 'Tên vai trò này đã tồn tại.';
  }
  return null;
}
