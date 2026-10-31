import { useCallback, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useCatalogResource } from '@/hooks/useCatalogResource';
import { useAuth, useViewerRole } from '@/features/auth/AuthProvider';
import { PermissionMatrix } from '@/features/permissions/components/PermissionMatrix';
import {
  DATA_SCOPE_LABELS,
  ROLE_TONE_BADGE_CLASS,
  filterRolesForViewer,
  type DataScope,
  type FeatureKey,
  type PermissionAction,
  type PermissionGrid,
  type RoleSummary,
} from '@/features/permissions/permissionRules';
import { fetchRoleGrid, saveRoleConfiguration } from '@/features/permissions/permissionService';
import { useRoles } from '@/features/permissions/useRoles';
import { fetchDepartmentCatalog } from '@/features/settings/settingsService';

const LOAD_ERROR = 'Không thể tải cấu hình phân quyền.';

interface RoleEditorData {
  roleKey: string;
  grid: PermissionGrid;
  departments: string[];
}

async function loadRoleEditorData(roleKey: string | null): Promise<RoleEditorData | null> {
  if (!roleKey) return null;
  const [grid, catalog] = await Promise.all([fetchRoleGrid(roleKey), fetchDepartmentCatalog()]);
  return { roleKey, grid, departments: catalog.departments.map((department) => department.name) };
}

export function RolePermissionTab() {
  const roles = useRoles();
  const activeRoleKey = useViewerRole().roleKey;
  const visibleRoles = filterRolesForViewer(roles.data ?? [], activeRoleKey);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = visibleRoles.some((role) => role.key === selectedKey) ? selectedKey : visibleRoles[0]?.key ?? null;
  const activeRole = visibleRoles.find((role) => role.key === activeKey) ?? null;

  const loadEditor = useCallback(() => loadRoleEditorData(activeKey), [activeKey]);
  const editor = useCatalogResource(loadEditor, LOAD_ERROR);
  const isEditorReady = activeRole !== null && editor.data?.roleKey === activeRole.key;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="permission-role" className="text-sm font-medium text-[#1F2A30]">
            Chọn vai trò cần cấu hình
          </Label>
          <Select value={activeKey ?? undefined} onValueChange={setSelectedKey} disabled={!roles.data?.length}>
            <SelectTrigger id="permission-role" className="h-10 border-[#E2E8F0] bg-white sm:w-[260px]">
              <SelectValue placeholder="Chưa có vai trò" />
            </SelectTrigger>
            <SelectContent>
              {visibleRoles.map((role) => (
                <SelectItem key={role.key} value={role.key}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeRole && <RoleBadgeLine role={activeRole} />}
      </div>

      {roles.loadError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {roles.loadError}
        </p>
      )}

      {editor.loadError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {editor.loadError}
        </p>
      )}

      {!isEditorReady && !editor.loadError && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C6670]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải cấu hình phân quyền...
        </div>
      )}

      {activeRole && isEditorReady && editor.data && (
        <RolePermissionEditor
          key={activeRole.key}
          role={activeRole}
          initialGrid={editor.data.grid}
          departments={editor.data.departments}
        />
      )}
    </div>
  );
}

function RoleBadgeLine({ role }: { role: RoleSummary }) {
  return (
    <div className="flex flex-col gap-1 sm:max-w-sm sm:text-right">
      <span className={`inline-flex w-fit items-center self-start rounded-full border px-2.5 py-0.5 text-xs font-medium sm:self-end ${ROLE_TONE_BADGE_CLASS[role.tone]}`}>
        {role.name}
      </span>
      <p className="text-sm text-[#5C6670]">{role.description || 'Chưa có mô tả cho vai trò này.'}</p>
    </div>
  );
}

interface RolePermissionEditorProps {
  role: RoleSummary;
  initialGrid: PermissionGrid;
  departments: string[];
}

function RolePermissionEditor({ role, initialGrid, departments }: RolePermissionEditorProps) {
  const [grid, setGrid] = useState<PermissionGrid>(initialGrid);
  const [scope, setScope] = useState<DataScope>(role.dataScope);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(role.departments);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshPermissions } = useAuth();
  const isDepartmentScope = scope === 'department';

  function toggleCell(feature: FeatureKey, action: PermissionAction) {
    setGrid((current) => ({
      ...current,
      [feature]: { ...current[feature], [action]: !current[feature][action] },
    }));
  }

  function toggleDepartment(name: string) {
    setSelectedDepartments((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await saveRoleConfiguration(role.key, {
        dataScope: scope,
        departments: isDepartmentScope ? selectedDepartments : [],
        grid,
      });
      refreshPermissions();
      toast({ title: 'Đã lưu ma trận phân quyền thành công!', className: 'border-success/40 text-success' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu cấu hình phân quyền.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[#1F2A30]">Phạm vi dữ liệu</h2>
          <p className="text-sm text-[#5C6670]">Vai trò này được xem và thao tác dữ liệu trong phạm vi nào.</p>
        </div>

        <RadioGroup
          value={scope}
          onValueChange={(value) => setScope(value as DataScope)}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6"
        >
          {(Object.keys(DATA_SCOPE_LABELS) as DataScope[]).map((item) => (
            <div key={item} className="flex items-center gap-2">
              <RadioGroupItem value={item} id={`scope-${item}`} className="border-[#4F7284] text-[#4F7284]" />
              <Label htmlFor={`scope-${item}`} className="cursor-pointer text-sm text-[#1F2A30]">
                {DATA_SCOPE_LABELS[item]}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${isDepartmentScope ? 'opacity-100' : 'opacity-50'}`}>
          <p className="text-sm font-medium text-[#1F2A30]">Bộ phận áp dụng</p>
          {departments.length === 0 ? (
            <p className="text-sm text-[#5C6670]">Chưa có bộ phận nào. Thêm bộ phận ở tab Cấu hình hệ thống.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {departments.map((name) => {
                const selected = selectedDepartments.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    disabled={!isDepartmentScope}
                    onClick={() => toggleDepartment(name)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-[#4F7284] bg-[#4F7284] text-white'
                        : 'border-[#E2E8F0] bg-white text-[#1F2A30] hover:border-[#4F7284]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[#1F2A30]">Ma trận quyền mặc định</h2>
          <p className="text-sm text-[#5C6670]">Áp dụng cho tất cả người dùng có vai trò này, trừ khi được cấu hình riêng.</p>
        </div>
        <PermissionMatrix grid={grid} onToggle={toggleCell} />
      </section>

      {errorMessage && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="h-10 bg-[#4F7284] text-white shadow-sm transition-colors duration-200 hover:bg-[#406273]"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu cấu hình phân quyền
        </Button>
      </div>
    </div>
  );
}
