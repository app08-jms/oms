import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmployeeProfile } from '@/features/employees/employeeRules';
import type { RoleSummary } from '@/features/permissions/permissionRules';
import { DEFAULT_ACCOUNT_PASSWORD, DEFAULT_ROLE_KEY, USERNAME_PATTERN } from '@/features/users/userRules';

const fieldClass = 'h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]';

interface CreateEmployeeAccountDialogProps {
  profile: EmployeeProfile;
  hotelName: string;
  roles: RoleSummary[];
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (values: { username: string; role: string }) => void;
}

export function CreateEmployeeAccountDialog({
  profile,
  hotelName,
  roles,
  isSaving,
  errorMessage,
  onCancel,
  onSubmit,
}: CreateEmployeeAccountDialogProps) {
  const [username, setUsername] = useState(profile.code);
  const [role, setRole] = useState(
    roles.some((item) => item.key === DEFAULT_ROLE_KEY) ? DEFAULT_ROLE_KEY : (roles[0]?.key ?? ''),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!USERNAME_PATTERN.test(username.trim())) {
      setValidationError('Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang (3-30 ký tự).');
      return;
    }
    if (!role) {
      setValidationError('Vui lòng chọn vai trò.');
      return;
    }
    setValidationError(null);
    onSubmit({ username: username.trim(), role });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-lg sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">Tạo tài khoản đăng nhập</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Tạo tài khoản và liên kết với hồ sơ của {profile.fullName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-account-username" className="text-sm font-medium text-[#1F2A30]">
                Tên đăng nhập
              </Label>
              <Input
                id="profile-account-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-account-role" className="text-sm font-medium text-[#1F2A30]">
                Vai trò
              </Label>
              <Select value={role || undefined} onValueChange={setRole}>
                <SelectTrigger id="profile-account-role" className={fieldClass}>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-account-full-name" className="text-sm font-medium text-[#1F2A30]">
                Họ và tên
              </Label>
              <Input id="profile-account-full-name" value={profile.fullName} disabled className={fieldClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-account-hotel" className="text-sm font-medium text-[#1F2A30]">
                Khách sạn
              </Label>
              <Input id="profile-account-hotel" value={hotelName} disabled className={fieldClass} />
            </div>
          </div>

          <p className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#1F2A30]">
            Mật khẩu mặc định khi tạo tài khoản là: {DEFAULT_ACCOUNT_PASSWORD}
          </p>

          {(validationError || errorMessage) && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {validationError ?? errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="border-[#E2E8F0] text-[#1F2A30]"
            >
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
