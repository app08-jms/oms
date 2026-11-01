import { KeyRound, Loader2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DEFAULT_ACCOUNT_PASSWORD, type UserAccountRow } from '@/features/users/userRules';

interface CredentialsDialogProps {
  account: UserAccountRow;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
}

export function AccountCredentialsDialog({
  account,
  isSaving,
  errorMessage,
  onCancel,
  onResetPassword,
  onToggleActive,
}: CredentialsDialogProps) {
  const willUnlock = !account.isActive;

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="border-[#E2E8F0] bg-white sm:max-w-md sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">Đổi mật khẩu / Khóa tài khoản</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Quản lý đăng nhập của tài khoản <span className="font-medium text-[#1F2A30]">{account.username}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[#1F2A30]">Đặt lại mật khẩu</span>
              <span className="text-xs text-[#5C6670]">
                Mật khẩu mặc định khi tạo tài khoản là: {DEFAULT_ACCOUNT_PASSWORD}.
              </span>
            </div>
            <Button
              type="button"
              onClick={onResetPassword}
              disabled={isSaving}
              className="shrink-0 bg-[#4F7284] text-white hover:bg-[#406273]"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Đặt lại
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[#1F2A30]">
                {willUnlock ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
              </span>
              <span className="text-xs text-[#5C6670]">
                {willUnlock
                  ? 'Tài khoản đang bị khóa và không thể đăng nhập.'
                  : 'Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa.'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onToggleActive}
              disabled={isSaving}
              className="shrink-0 border-[#E2E8F0] text-[#1F2A30] hover:bg-[#F1F5F9]"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : willUnlock ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {willUnlock ? 'Mở khóa' : 'Khóa'}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            {errorMessage}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
