import { useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { PageHeading } from '@/components/layout/PageHeading';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { toast } from '@/hooks/use-toast';
import { AccountDetailsDialog } from '@/features/users/components/AccountDetailsDialog';
import { AccountCredentialsDialog } from '@/features/users/components/AccountCredentialsDialog';
import { LinkProfileDialog } from '@/features/users/components/AccountActionDialogs';
import { UserFilterBar } from '@/features/users/components/UserFilterBar';
import { UserFormDialog } from '@/features/users/components/UserFormDialog';
import { UserTable } from '@/features/users/components/UserTable';
import { useAuth, useViewerRole } from '@/features/auth/AuthProvider';
import { UserOverrideDialog } from '@/features/permissions/components/UserOverrideDialog';
import { SUPER_ADMIN_ROLE_KEY, canViewerSeeRole, filterRolesForViewer } from '@/features/permissions/permissionRules';
import { useRoles } from '@/features/permissions/useRoles';
import {
  DEFAULT_ACCOUNT_PASSWORD,
  DEFAULT_USER_FILTERS,
  applyUserFilters,
  type NewAccountDraft,
  type UserAccountRow,
  type UserFilters,
} from '@/features/users/userRules';
import {
  createUserAccount,
  linkAccountToEmployee,
  resetAccountPassword,
  setAccountActive,
  unlinkAccountFromEmployee,
  updateAccountDetails,
} from '@/features/users/userService';
import { useUserAccounts } from '@/features/users/useUserAccounts';

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; account: UserAccountRow }
  | { kind: 'link'; account: UserAccountRow }
  | { kind: 'unlink'; account: UserAccountRow }
  | { kind: 'credentials'; account: UserAccountRow }
  | { kind: 'reset'; account: UserAccountRow }
  | { kind: 'overrides'; account: UserAccountRow }
  | null;

export function UserManagementPage() {
  const { session } = useAuth();
  const catalog = useUserAccounts();
  const roles = useRoles();
  const activeRoleKey = useViewerRole().roleKey;
  const roleList = filterRolesForViewer(roles.data ?? [], activeRoleKey);
  const isSuperAdmin = session?.account.roleKey === SUPER_ADMIN_ROLE_KEY;
  const hotelOptions = isSuperAdmin ? catalog.data?.hotels ?? [] : session ? [session.hotel] : [];
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [dialog, setDialog] = useState<DialogState>(null);

  const accounts = catalog.data?.accounts ?? [];
  const employees = catalog.data?.employees ?? [];

  const unlinkedEmployees = useMemo(() => {
    const linked = new Set(accounts.map((account) => account.employeeSystemUid));
    return employees.filter((employee) => !linked.has(employee.systemUid));
  }, [accounts, employees]);

  const visibleRows = useMemo(
    () => applyUserFilters(accounts.filter((account) => canViewerSeeRole(activeRoleKey, account.role)), filters),
    [accounts, filters, activeRoleKey],
  );

  function openDialog(next: NonNullable<DialogState>) {
    catalog.clearActionError();
    setDialog(next);
  }

  function closeDialog() {
    catalog.clearActionError();
    setDialog(null);
  }

  async function handleCreate(draft: NewAccountDraft) {
    if (!session) return;
    const saved = await catalog.runAction(
      () => createUserAccount(session.token, draft),
      'Không thể tạo tài khoản. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({
      title: 'Tạo tài khoản thành công!',
      description: `Mật khẩu ban đầu: ${DEFAULT_ACCOUNT_PASSWORD}`,
      className: 'border-success/40 text-success',
    });
  }

  async function handleDetailsSave(account: UserAccountRow, values: { fullName: string; role: string }) {
    const saved = await catalog.runAction(
      () => updateAccountDetails(account.systemUid, values),
      'Không thể cập nhật thông tin. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({ title: 'Đã cập nhật thông tin', description: `Tài khoản ${account.username} đã được cập nhật.` });
  }

  async function handleLinkSave(account: UserAccountRow, employeeSystemUid: string) {
    const saved = await catalog.runAction(
      () => linkAccountToEmployee(account.systemUid, employeeSystemUid),
      'Không thể liên kết hồ sơ. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({ title: 'Đã liên kết hồ sơ', description: `Tài khoản ${account.username} đã được liên kết.` });
  }

  async function handleUnlinkConfirm(account: UserAccountRow) {
    const saved = await catalog.runAction(
      () => unlinkAccountFromEmployee(account.systemUid),
      'Không thể hủy liên kết hồ sơ. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({ title: 'Đã hủy liên kết hồ sơ', description: `Tài khoản ${account.username} không còn liên kết với hồ sơ nhân viên.` });
  }

  async function handleResetConfirm(account: UserAccountRow) {
    const saved = await catalog.runAction(
      () => resetAccountPassword(account.systemUid),
      'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({
      title: 'Đã đặt lại mật khẩu',
      description: `Mật khẩu của ${account.username} đã được đặt về ${DEFAULT_ACCOUNT_PASSWORD}.`,
    });
  }

  async function handleToggleActive(account: UserAccountRow) {
    const nextActive = !account.isActive;
    const saved = await catalog.runAction(
      () => setAccountActive(account.systemUid, nextActive),
      'Không thể cập nhật trạng thái. Vui lòng thử lại.',
    );
    if (!saved) return;
    setDialog(null);
    toast({
      title: nextActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
      description: `Tài khoản ${account.username} đang ở trạng thái ${nextActive ? 'hoạt động' : 'đã khóa'}.`,
    });
  }

  return (
    <div className="-mx-4 -my-6 flex min-h-full flex-col gap-6 bg-white px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <PageHeading groupTitle="Hệ thống" title="Quản lý tài khoản" />
          <p className="text-sm text-[#5C6670]">
            Quản lý danh sách tài khoản người dùng, phân gán vai trò và liên kết hồ sơ nhân sự.
          </p>
        </div>
        <Button
          onClick={() => openDialog({ kind: 'create' })}
          className="h-10 bg-[#4F7284] text-white shadow-sm transition-colors duration-200 hover:bg-[#406273]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm tài khoản mới
        </Button>
      </div>

      <UserFilterBar filters={filters} roles={roleList} onFiltersChange={setFilters} />

      {catalog.actionError && !dialog && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {catalog.actionError}
        </p>
      )}

      {catalog.isLoading && !catalog.data && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C6670]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách tài khoản...
        </div>
      )}

      {catalog.loadError && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="text-sm text-error">
            {catalog.loadError}
          </p>
          <Button variant="outline" size="sm" onClick={() => void catalog.refresh()} className="border-[#E2E8F0] text-[#1F2A30]">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Thử lại
          </Button>
        </div>
      )}

      {catalog.data && (
        <UserTable
          rows={visibleRows}
          roles={roleList}
          hasAnyAccounts={accounts.length > 0}
          isBusy={catalog.isSaving}
          onEditDetails={(account) => openDialog({ kind: 'edit', account })}
          onLinkProfile={(account) => openDialog({ kind: 'link', account })}
          onUnlinkProfile={(account) => openDialog({ kind: 'unlink', account })}
          onManageCredentials={(account) => openDialog({ kind: 'credentials', account })}
          onOverridePermissions={(account) => openDialog({ kind: 'overrides', account })}
        />
      )}

      {dialog?.kind === 'create' && (
        <UserFormDialog
          unlinkedEmployees={unlinkedEmployees}
          hotels={hotelOptions}
          hotelLocked={!isSuperAdmin}
          viewerRoleKey={activeRoleKey}
          isSaving={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onSubmit={(draft) => void handleCreate(draft)}
        />
      )}

      {dialog?.kind === 'edit' && (
        <AccountDetailsDialog
          account={dialog.account}
          roles={roleList}
          isSaving={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onSave={(values) => void handleDetailsSave(dialog.account, values)}
        />
      )}

      {dialog?.kind === 'credentials' && (
        <AccountCredentialsDialog
          account={dialog.account}
          isSaving={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onResetPassword={() => openDialog({ kind: 'reset', account: dialog.account })}
          onToggleActive={() => void handleToggleActive(dialog.account)}
        />
      )}

      {dialog?.kind === 'unlink' && (
        <ConfirmActionDialog
          title="Hủy liên kết hồ sơ?"
          description={`Tài khoản ${dialog.account.username} sẽ không còn liên kết với hồ sơ ${dialog.account.employee?.fullName ?? 'nhân viên'}. Bạn có thể liên kết lại sau.`}
          confirmLabel="Hủy liên kết"
          tone="primary"
          isPending={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onConfirm={() => void handleUnlinkConfirm(dialog.account)}
        />
      )}

      {dialog?.kind === 'link' && (
        <LinkProfileDialog
          account={dialog.account}
          unlinkedEmployees={unlinkedEmployees}
          isSaving={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onSave={(employeeSystemUid) => void handleLinkSave(dialog.account, employeeSystemUid)}
        />
      )}

      {dialog?.kind === 'overrides' && (
        <UserOverrideDialog
          userSystemUid={dialog.account.systemUid}
          username={dialog.account.username}
          roleKey={dialog.account.role}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'reset' && (
        <ConfirmActionDialog
          title="Đặt lại mật khẩu?"
          description={`Mật khẩu của ${dialog.account.username} sẽ được đặt về mặc định ${DEFAULT_ACCOUNT_PASSWORD}.`}
          confirmLabel="Đặt lại mật khẩu"
          tone="primary"
          isPending={catalog.isSaving}
          errorMessage={catalog.actionError}
          onCancel={closeDialog}
          onConfirm={() => void handleResetConfirm(dialog.account)}
        />
      )}
    </div>
  );
}
