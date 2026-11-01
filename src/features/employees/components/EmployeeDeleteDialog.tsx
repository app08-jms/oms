import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EmployeeProfile } from '@/features/employees/employeeRules';

interface EmployeeDeleteDialogProps {
  profile: EmployeeProfile;
  canForceDelete: boolean;
  isDeleting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (force: boolean) => void;
}

export function EmployeeDeleteDialog({
  profile,
  canForceDelete,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: EmployeeDeleteDialogProps) {
  const [force, setForce] = useState(false);

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <AlertDialogContent className="border-[#E2E8F0] bg-white sm:rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-[#1F2A30]">Xóa hồ sơ nhân viên?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#5C6670]">
            {canForceDelete
              ? `Hồ sơ của ${profile.fullName} (${profile.code}) sẽ bị xóa khỏi danh sách. Nếu nhân viên đã có dữ liệu chấm công hoặc lịch làm việc, hệ thống sẽ báo để bạn xác nhận xóa vĩnh viễn.`
              : `Hồ sơ của ${profile.fullName} (${profile.code}) sẽ bị xóa khỏi danh sách. Nếu nhân viên đã có dữ liệu chấm công hoặc lịch làm việc, hồ sơ sẽ được chuyển sang trạng thái Nghỉ việc và tài khoản liên kết sẽ bị khóa.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {canForceDelete && (
          <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error/5 p-4">
            <Checkbox
              id="force-delete-employee"
              checked={force}
              disabled={isDeleting}
              onCheckedChange={(checked) => setForce(checked === true)}
              className="mt-0.5 border-[#CBD5E1] data-[state=checked]:border-error data-[state=checked]:bg-error"
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="force-delete-employee" className="text-sm font-semibold text-[#1F2A30]">
                Xóa vĩnh viễn
              </Label>
              <span className="text-xs text-[#5C6670]">
                Xóa cùng toàn bộ dữ liệu chấm công, lịch làm việc, sổ phép, điều chỉnh lương và tài khoản đăng nhập liên kết. Không thể hoàn tác.
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            {errorMessage}
          </p>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isDeleting} className="border-[#E2E8F0] text-[#1F2A30]">
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm(canForceDelete && force);
            }}
            disabled={isDeleting}
            className="bg-error text-white hover:bg-error/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {canForceDelete && force ? 'Xóa vĩnh viễn' : 'Xóa nhân viên'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
