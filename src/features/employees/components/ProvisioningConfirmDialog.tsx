import { useState } from 'react';
import { BookOpenCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_INITIAL_LEAVE_DAYS, type ProvisioningOptions } from '@/features/employees/employeeRules';

interface ProvisioningConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (options: ProvisioningOptions) => void;
}

const MAX_LEAVE_DAYS = 365;

export function ProvisioningConfirmDialog({
  title,
  description,
  confirmLabel,
  isSaving,
  errorMessage,
  onCancel,
  onConfirm,
}: ProvisioningConfirmDialogProps) {
  const [trackLeave, setTrackLeave] = useState(true);
  const [leaveDaysText, setLeaveDaysText] = useState(String(DEFAULT_INITIAL_LEAVE_DAYS));
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleConfirm() {
    const parsedDays = leaveDaysText.trim() === '' ? DEFAULT_INITIAL_LEAVE_DAYS : Number(leaveDaysText);
    if (
      trackLeave &&
      (!Number.isInteger(parsedDays) || parsedDays < 0 || parsedDays > MAX_LEAVE_DAYS)
    ) {
      setValidationError(`Số ngày phép ban đầu phải là số nguyên từ 0 đến ${MAX_LEAVE_DAYS}.`);
      return;
    }
    setValidationError(null);
    onConfirm({
      trackLeave,
      initialLeaveDays: trackLeave ? parsedDays : DEFAULT_INITIAL_LEAVE_DAYS,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-lg sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">{title}</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="track-leave"
                checked={trackLeave}
                disabled={isSaving}
                onCheckedChange={(checked) => setTrackLeave(checked === true)}
                className="mt-0.5 border-[#CBD5E1] data-[state=checked]:border-[#4F7284] data-[state=checked]:bg-[#4F7284]"
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="track-leave" className="flex items-center gap-2 text-sm font-semibold text-[#1F2A30]">
                  <BookOpenCheck className="h-4 w-4 text-[#4F7284]" />
                  Theo dõi quỹ phép năm vào Sổ phép
                </Label>
                <span className="text-xs text-[#5C6670]">Nhân viên sẽ được tính phép trong năm hiện tại.</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 pl-7">
              <Label htmlFor="initial-leave-days" className="text-sm font-medium text-[#1F2A30]">
                Số ngày phép ban đầu
              </Label>
              <Input
                id="initial-leave-days"
                type="number"
                min={0}
                max={MAX_LEAVE_DAYS}
                inputMode="numeric"
                value={leaveDaysText}
                disabled={!trackLeave || isSaving}
                onChange={(event) => setLeaveDaysText(event.target.value)}
                className="h-10 w-full border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284] sm:w-40"
              />
            </div>
          </section>

          {(validationError || errorMessage) && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {validationError ?? errorMessage}
            </p>
          )}
        </div>

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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="bg-[#4F7284] text-white hover:bg-[#3F5C6C]"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
