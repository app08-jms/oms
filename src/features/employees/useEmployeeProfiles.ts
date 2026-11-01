import { useCallback, useEffect, useState } from 'react';
import {
  createEmployees,
  deleteEmployeeProfile,
  fetchEmployeeProfiles,
  setLeaveTracking as setLeaveTrackingRequest,
  updateEmployeeProfile,
  type CreateEmployeesResult,
  type DeleteEmployeeOutcome,
} from '@/features/employees/employeeService';
import type { EmployeeDraft, EmployeeProfile, ProvisioningOptions } from '@/features/employees/employeeRules';
import { createUserAccount } from '@/features/users/userService';

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useEmployeeProfiles(hotelScopeId: string | null, enabled: boolean) {
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProfiles([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setProfiles(await fetchEmployeeProfiles(hotelScopeId));
      setLoadError(null);
    } catch {
      setLoadError('Không thể tải danh sách nhân viên. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, hotelScopeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction<T>(action: () => Promise<T>, fallback: string): Promise<T | null> {
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await action();
      await refresh();
      return result;
    } catch (error) {
      setActionError(messageOf(error, fallback));
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  function createProfiles(drafts: EmployeeDraft[], options: ProvisioningOptions): Promise<CreateEmployeesResult | null> {
    return runAction(() => createEmployees(drafts, options), 'Không thể lưu hồ sơ. Vui lòng thử lại.');
  }

  async function updateProfile(code: string, draft: EmployeeDraft): Promise<boolean> {
    const result = await runAction(() => updateEmployeeProfile(code, draft), 'Không thể cập nhật hồ sơ.');
    return result !== null;
  }

  async function deleteProfile(token: string, code: string, force: boolean): Promise<DeleteEmployeeOutcome | null> {
    return runAction(() => deleteEmployeeProfile(token, code, force), 'Không thể xóa nhân viên.');
  }

  async function createAccount(
    token: string,
    profile: EmployeeProfile,
    values: { username: string; role: string },
  ): Promise<boolean> {
    const result = await runAction(
      () =>
        createUserAccount(token, {
          employeeSystemUid: profile.systemUid,
          hotelId: profile.hotelId,
          username: values.username,
          fullName: profile.fullName,
          role: values.role,
        }).then(() => true),
      'Không thể tạo tài khoản. Vui lòng thử lại.',
    );
    return result === true;
  }

  async function setLeaveTracking(code: string, enabled: boolean): Promise<boolean> {
    const result = await runAction(
      () => setLeaveTrackingRequest(code, enabled),
      'Không thể cập nhật theo dõi phép.'
    );
    return result !== null;
  }

  return {
    profiles,
    isLoading,
    loadError,
    isSaving,
    actionError,
    clearActionError: () => setActionError(null),
    createProfiles,
    updateProfile,
    deleteProfile,
    createAccount,
    setLeaveTracking,
  };
}
