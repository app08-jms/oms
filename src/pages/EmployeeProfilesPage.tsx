import { useCallback, useMemo, useState } from 'react';
import { Download, FileUp, Plus } from 'lucide-react';
import { PageHeading } from '@/components/layout/PageHeading';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchAccountHotels } from '@/features/auth/authService';
import type { HotelRef } from '@/features/auth/authRules';
import { toast } from '@/hooks/use-toast';
import { useCatalogResource } from '@/hooks/useCatalogResource';
import { SUPER_ADMIN_ROLE_KEY } from '@/features/permissions/permissionRules';
import {
  applyEmployeeFilters,
  createEmptyDraft,
  DEFAULT_EMPLOYEE_FILTERS,
  draftFromProfile,
  type EmployeeDraft,
  type EmployeeFilters,
  type EmployeeProfile,
  type ProvisioningOptions,
} from '@/features/employees/employeeRules';
import { downloadEmployeeTemplate } from '@/features/employees/employeeExcel';
import { fetchOwnEmployeeProfile } from '@/features/employees/employeeService';
import { useEmployeeProfiles } from '@/features/employees/useEmployeeProfiles';
import { EmployeeDeleteDialog } from '@/features/employees/components/EmployeeDeleteDialog';
import { EmployeeFilterBar } from '@/features/employees/components/EmployeeFilterBar';
import { EmployeeFormDialog } from '@/features/employees/components/EmployeeFormDialog';
import { EmployeeImportDialog } from '@/features/employees/components/EmployeeImportDialog';
import { EmployeeProfileCard } from '@/features/employees/components/EmployeeProfileCard';
import { EmployeeTable } from '@/features/employees/components/EmployeeTable';
import { ProvisioningConfirmDialog } from '@/features/employees/components/ProvisioningConfirmDialog';

const STAFF_ROLE_KEY = 'staff';

type FormState = { mode: 'add' } | { mode: 'edit'; profile: EmployeeProfile };

interface PendingCreate {
  source: 'add' | 'import';
  drafts: EmployeeDraft[];
}

export function EmployeeProfilesPage() {
  const { session } = useAuth();
  const account = session?.account;
  const isSuperAdmin = account?.roleKey === SUPER_ADMIN_ROLE_KEY;
  const isStaffView = account?.roleKey === STAFF_ROLE_KEY;
  const viewerHotelId = session?.hotel.id ?? '';
  const hotelScopeId = isSuperAdmin ? null : viewerHotelId;
  const viewerSystemUid = account?.systemUid ?? null;

  const loadHotels = useCallback(
    (): Promise<HotelRef[]> => (account ? fetchAccountHotels(account) : Promise.resolve([])),
    [account]
  );
  const hotelsCatalog = useCatalogResource(loadHotels, 'Không thể tải danh sách khách sạn.');
  const hotels = useMemo(() => hotelsCatalog.data ?? [], [hotelsCatalog.data]);
  const hotelNameById = useMemo(() => new Map(hotels.map((hotel) => [hotel.id, hotel.name])), [hotels]);
  const defaultHotelId = isSuperAdmin ? (hotels[0]?.id ?? '') : viewerHotelId;

  const loadOwnProfile = useCallback(
    (): Promise<EmployeeProfile | null> =>
      isStaffView && viewerSystemUid ? fetchOwnEmployeeProfile(viewerSystemUid) : Promise.resolve(null),
    [isStaffView, viewerSystemUid]
  );
  const ownProfile = useCatalogResource(loadOwnProfile, 'Không thể tải hồ sơ của bạn.');

  const employees = useEmployeeProfiles(hotelScopeId, !isStaffView);
  const [filters, setFilters] = useState<EmployeeFilters>(() => ({
    ...DEFAULT_EMPLOYEE_FILTERS,
    hotelId: hotelScopeId ?? 'all',
  }));
  const [formState, setFormState] = useState<FormState | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeProfile | null>(null);

  const takenCodes = useMemo(() => new Set(employees.profiles.map((profile) => profile.code)), [employees.profiles]);
  const rows = useMemo(() => applyEmployeeFilters(employees.profiles, filters), [employees.profiles, filters]);
  const totalCount = employees.profiles.length;

  const emptyMessage =
    totalCount === 0 ? 'Chưa có nhân viên nào trong danh sách.' : 'Không tìm thấy nhân viên phù hợp với bộ lọc.';

  const pageLoadError = isStaffView ? ownProfile.loadError : (employees.loadError ?? hotelsCatalog.loadError);

  function openForm(next: FormState) {
    employees.clearActionError();
    setFormState(next);
  }

  function openImport() {
    employees.clearActionError();
    setIsImportOpen(true);
  }

  function handleAddSubmit(draft: EmployeeDraft) {
    setFormState(null);
    employees.clearActionError();
    setPendingCreate({ source: 'add', drafts: [draft] });
  }

  async function handleEditSubmit(code: string, draft: EmployeeDraft) {
    const saved = await employees.updateProfile(code, draft);
    if (!saved) return;
    setFormState(null);
    toast({ title: 'Đã cập nhật hồ sơ nhân viên.' });
  }

  function handleImportReady(drafts: EmployeeDraft[]) {
    setIsImportOpen(false);
    employees.clearActionError();
    setPendingCreate({ source: 'import', drafts });
  }

  async function handleCreateConfirm(options: ProvisioningOptions) {
    if (!pendingCreate) return;
    const result = await employees.createProfiles(pendingCreate.drafts, options);
    if (!result) return;
    setPendingCreate(null);

    const count = pendingCreate.drafts.length;
    if (result.incompleteCodes.length > 0) {
      toast({
        title: 'Đã lưu hồ sơ nhưng chưa hoàn tất thiết lập.',
        description: `Chưa hoàn tất cho: ${result.incompleteCodes.join(', ')}. Vui lòng thử lại sau.`,
      });
      return;
    }
    toast({
      title: pendingCreate.source === 'add' ? 'Đã thêm nhân viên mới.' : `Đã nhập ${count} nhân viên.`,
    });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const deleted = await employees.deleteProfile(deleteTarget.code);
    if (!deleted) return;
    setDeleteTarget(null);
    toast({ title: 'Đã xóa hồ sơ nhân viên.' });
  }

  const pendingSummary = pendingCreate
    ? pendingCreate.source === 'add'
      ? {
          title: 'Xác nhận thêm nhân viên',
          description: `${pendingCreate.drafts[0]?.fullName} (${pendingCreate.drafts[0]?.code}) sẽ được lưu vào hồ sơ. Chọn cách thiết lập bên dưới.`,
        }
      : {
          title: 'Xác nhận nhập danh sách',
          description: `${pendingCreate.drafts.length} nhân viên sẽ được lưu vào hồ sơ. Các lựa chọn bên dưới áp dụng cho tất cả.`,
        }
    : null;

  const ownHotelName = ownProfile.data
    ? (hotelNameById.get(ownProfile.data.hotelId) ?? session?.hotel.name ?? '')
    : '';

  return (
    <div className="-mx-4 -my-6 flex min-h-full flex-col gap-6 bg-white px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-1">
          <PageHeading groupTitle="Nhân sự" title="Hồ sơ nhân viên" />
          <p className="text-sm text-[#5C6670]">
            {isStaffView
              ? 'Thông tin định danh, cư trú và công việc của bạn.'
              : 'Quản lý thông tin nhân sự, cấp phát tài khoản hệ thống và thiết lập chế độ phép năm.'}
          </p>
        </div>
        {!isStaffView && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={downloadEmployeeTemplate}
              className="h-10 border-[#E2E8F0] bg-white text-[#1F2A30] hover:bg-[#F8FAFC]"
            >
              <Download className="mr-2 h-4 w-4" />
              Tải file mẫu (.xlsx)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openImport}
              disabled={employees.isLoading}
              className="h-10 border-[#E2E8F0] bg-white text-[#1F2A30] hover:bg-[#F8FAFC]"
            >
              <FileUp className="mr-2 h-4 w-4" />
              Nhập danh sách (Excel)
            </Button>
            <Button
              type="button"
              onClick={() => openForm({ mode: 'add' })}
              disabled={employees.isLoading}
              className="h-10 bg-[#4F7284] text-white transition-colors duration-200 hover:bg-[#3F5C6C]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm nhân viên mới
            </Button>
          </div>
        )}
      </div>

      {pageLoadError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {pageLoadError}
        </p>
      )}
      {!isStaffView && !formState && !pendingCreate && !isImportOpen && employees.actionError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {employees.actionError}
        </p>
      )}

      {isStaffView ? (
        ownProfile.isLoading ? (
          <p className="text-sm text-[#5C6670]">Đang tải hồ sơ của bạn...</p>
        ) : ownProfile.data ? (
          <EmployeeProfileCard profile={ownProfile.data} hotelName={ownHotelName} />
        ) : (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] p-8 text-center text-sm text-[#5C6670]">
            Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên.
          </div>
        )
      ) : (
        <>
          <EmployeeFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            hotels={hotels}
            hotelLocked={!isSuperAdmin}
          />

          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmployeeTable
                rows={rows}
                hotelNameById={hotelNameById}
                isLoading={employees.isLoading}
                isSaving={employees.isSaving}
                emptyMessage={emptyMessage}
                onEdit={(profile) => openForm({ mode: 'edit', profile })}
                onDelete={(profile) => {
                  employees.clearActionError();
                  setDeleteTarget(profile);
                }}
                onToggleLeave={(profile, enabled) => void employees.setLeaveTracking(profile.code, enabled)}
              />
            </div>
            {!employees.isLoading && (
              <p className="text-xs text-[#5C6670]">
                Hiển thị {rows.length} / {totalCount} nhân viên.
              </p>
            )}
          </div>
        </>
      )}

      {formState?.mode === 'add' && (
        <EmployeeFormDialog
          mode="add"
          initialDraft={createEmptyDraft(defaultHotelId)}
          takenCodes={takenCodes}
          hotels={hotels}
          hotelLocked={!isSuperAdmin}
          isSaving={employees.isSaving}
          errorMessage={employees.actionError}
          onCancel={() => setFormState(null)}
          onSubmit={handleAddSubmit}
        />
      )}

      {formState?.mode === 'edit' && (
        <EmployeeFormDialog
          mode="edit"
          initialDraft={draftFromProfile(formState.profile)}
          takenCodes={takenCodes}
          hotels={hotels}
          hotelLocked={!isSuperAdmin}
          isSaving={employees.isSaving}
          errorMessage={employees.actionError}
          onCancel={() => setFormState(null)}
          onSubmit={(draft) => void handleEditSubmit(formState.profile.code, draft)}
        />
      )}

      {isImportOpen && (
        <EmployeeImportDialog
          takenCodes={takenCodes}
          hotels={hotels}
          hotelLocked={!isSuperAdmin}
          defaultHotelId={defaultHotelId}
          onCancel={() => setIsImportOpen(false)}
          onReady={handleImportReady}
        />
      )}

      {pendingCreate && pendingSummary && (
        <ProvisioningConfirmDialog
          title={pendingSummary.title}
          description={pendingSummary.description}
          confirmLabel="Xác nhận và lưu"
          isSaving={employees.isSaving}
          errorMessage={employees.actionError}
          onCancel={() => setPendingCreate(null)}
          onConfirm={(options) => void handleCreateConfirm(options)}
        />
      )}

      {deleteTarget && (
        <EmployeeDeleteDialog
          profile={deleteTarget}
          isDeleting={employees.isSaving}
          errorMessage={employees.actionError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteConfirm()}
        />
      )}
    </div>
  );
}
