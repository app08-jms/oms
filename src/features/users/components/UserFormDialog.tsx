import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type HotelRef } from '@/features/auth/authRules';
import { type RoleSummary } from '@/features/permissions/permissionRules';
import {
  DEFAULT_ACCOUNT_PASSWORD,
  createEmptyAccountDraft,
  employeeOptionLabel,
  validateAccountDraft,
  type EmployeeOption,
  type NewAccountDraft,
} from '@/features/users/userRules';

const fieldClass = 'h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]';
const NO_PROFILE = 'none';

interface UserFormDialogProps {
  unlinkedEmployees: EmployeeOption[];
  hotels: HotelRef[];
  hotelLocked: boolean;
  roles: RoleSummary[];
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (draft: NewAccountDraft) => void;
}

export function UserFormDialog({
  unlinkedEmployees,
  hotels,
  hotelLocked,
  roles,
  isSaving,
  errorMessage,
  onCancel,
  onSubmit,
}: UserFormDialogProps) {
  const [draft, setDraft] = useState<NewAccountDraft>(() => createEmptyAccountDraft(hotelLocked ? hotels[0]?.id ?? '' : ''));
  const [validationError, setValidationError] = useState<string | null>(null);
  const isLinked = draft.employeeSystemUid !== '';
  const lockedHotel = hotelLocked ? hotels[0] ?? null : null;

  function handleProfileChange(value: string) {
    if (value === NO_PROFILE) {
      setDraft((current) => ({ ...current, employeeSystemUid: '', username: '', fullName: '' }));
      return;
    }
    const employee = unlinkedEmployees.find((item) => item.systemUid === value);
    if (!employee) return;
    setDraft((current) => ({
      ...current,
      employeeSystemUid: employee.systemUid,
      username: employee.code,
      fullName: employee.fullName,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateAccountDraft(draft, unlinkedEmployees);
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    onSubmit(draft);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-lg sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">Thêm tài khoản mới</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Tài khoản mới dùng mật khẩu ban đầu {DEFAULT_ACCOUNT_PASSWORD}. Có thể liên kết với một hồ sơ nhân viên chưa có tài khoản khác.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-profile" className="text-sm font-medium text-[#1F2A30]">
              Liên kết hồ sơ nhân viên
            </Label>
            <Select value={draft.employeeSystemUid || NO_PROFILE} onValueChange={handleProfileChange}>
              <SelectTrigger id="account-profile" className={fieldClass}>
                <SelectValue placeholder="Chọn hồ sơ nhân viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROFILE}>Không liên kết</SelectItem>
                {unlinkedEmployees.map((employee) => (
                  <SelectItem key={employee.systemUid} value={employee.systemUid}>
                    {employeeOptionLabel(employee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-hotel" className="text-sm font-medium text-[#1F2A30]">
              Khách sạn
            </Label>
            {lockedHotel ? (
              <Input id="account-hotel" value={lockedHotel.name} disabled className={fieldClass} />
            ) : (
              <Select value={draft.hotelId || undefined} onValueChange={(value) => setDraft((current) => ({ ...current, hotelId: value }))}>
                <SelectTrigger id="account-hotel" className={fieldClass}>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-username" className="text-sm font-medium text-[#1F2A30]">
                Tên đăng nhập
              </Label>
              <Input
                id="account-username"
                value={draft.username}
                disabled={isLinked}
                onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                placeholder="VD: vluna.gm"
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-full-name" className="text-sm font-medium text-[#1F2A30]">
                Họ và tên
              </Label>
              <Input
                id="account-full-name"
                value={draft.fullName}
                disabled={isLinked}
                onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Nguyễn Văn A"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="account-role" className="text-sm font-medium text-[#1F2A30]">
                Vai trò
              </Label>
              <Select
                value={draft.role}
                onValueChange={(value) => setDraft((current) => ({ ...current, role: value }))}
              >
                <SelectTrigger id="account-role" className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(validationError || errorMessage) && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {validationError ?? errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="border-[#E2E8F0] text-[#1F2A30]">
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#4F7284] text-white hover:bg-[#406273]">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
