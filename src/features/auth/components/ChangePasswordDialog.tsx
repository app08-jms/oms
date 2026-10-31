import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_PASSWORD_LENGTH, validatePasswordChange } from '@/features/auth/authRules';
import { useAuth } from '@/features/auth/AuthProvider';
import { changeOwnPassword } from '@/features/auth/authService';
import { toast } from '@/hooks/use-toast';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM = { current: '', next: '', confirm: '' };

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { session } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function close() {
    setForm(EMPTY_FORM);
    setError(null);
    onOpenChange(false);
  }

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !session) return;
    const validationError = validatePasswordChange(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await changeOwnPassword(session.token, form.current, form.next);
      toast({ title: 'Đã cập nhật mật khẩu', description: 'Mật khẩu mới sẽ được dùng cho lần đăng nhập tiếp theo.' });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md border-[#E2E8F0] bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0F172A]">Đổi mật khẩu</DialogTitle>
          <DialogDescription className="text-sm text-[#64748B]">
            Mật khẩu mới cần có ít nhất {MIN_PASSWORD_LENGTH} ký tự.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-medium text-[#334155]">
              Mật khẩu hiện tại
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={(event) => updateField('current', event.target.value)}
              className="h-10 border-[#E2E8F0] text-[#0F172A] focus-visible:ring-[#4F7284]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium text-[#334155]">
              Mật khẩu mới
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(event) => updateField('next', event.target.value)}
              className="h-10 border-[#E2E8F0] text-[#0F172A] focus-visible:ring-[#4F7284]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium text-[#334155]">
              Xác nhận mật khẩu mới
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => updateField('confirm', event.target.value)}
              className="h-10 border-[#E2E8F0] text-[#0F172A] focus-visible:ring-[#4F7284]"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isSaving}
              className="h-10 border-[#E2E8F0] text-[#334155] transition-colors duration-200 hover:bg-[#F8FAFC]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 bg-[#4F7284] text-white transition-colors duration-200 hover:bg-[#3F5C6C]"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Cập nhật mật khẩu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
