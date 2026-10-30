import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  calculateStandardHours,
  formatBreakMinutes,
  formatHeSoCong,
  formatStandardHours,
  HE_SO_CONG_OPTIONS,
  normalizeShiftDraft,
  validateShiftDraft,
  type ShiftDraft,
} from '@/features/settings/settingsRules';

interface ShiftFormDialogProps {
  mode: 'add' | 'edit';
  initialDraft: ShiftDraft;
  takenCodes: Set<string>;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (draft: ShiftDraft) => void;
}

const fieldClass = 'h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-[#1F2A30]">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ShiftFormDialog({
  mode,
  initialDraft,
  takenCodes,
  isSaving,
  errorMessage,
  onCancel,
  onSubmit,
}: ShiftFormDialogProps) {
  const [draft, setDraft] = useState<ShiftDraft>(initialDraft);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isEdit = mode === 'edit';
  const isWorking = draft.isWorking;
  const hours = calculateStandardHours(draft);
  const crossesMidnight = isWorking && !!draft.startTime && !!draft.endTime && draft.endTime < draft.startTime;

  function update<K extends keyof ShiftDraft>(key: K, value: ShiftDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateShiftDraft(draft, takenCodes, isEdit);
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    onSubmit(normalizeShiftDraft(draft));
  }

  const shownError = validationError ?? errorMessage;

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-xl sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">
            {isEdit ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Cấu hình khung giờ và thời gian nghỉ giữa ca. Tổng giờ làm chuẩn được tính tự động.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mã ca" htmlFor="shift-code">
              <Input
                id="shift-code"
                value={draft.code}
                disabled={isEdit}
                onChange={(event) => update('code', event.target.value.toUpperCase())}
                placeholder="VD: S1"
                autoComplete="off"
                maxLength={10}
                className={fieldClass}
              />
            </Field>
            <Field label="Tên ca" htmlFor="shift-name">
              <Input
                id="shift-name"
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="VD: Ca sáng"
                className={fieldClass}
              />
            </Field>
            <Field label="Hệ số công" htmlFor="shift-he-so-cong">
              <Select value={draft.heSoCong} onValueChange={(value) => update('heSoCong', value)}>
                <SelectTrigger id="shift-he-so-cong" className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HE_SO_CONG_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {formatHeSoCong(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-[#1F2A30]">Trạng thái ca</Label>
            <RadioGroup
              value={isWorking ? 'working' : 'off'}
              onValueChange={(value) => update('isWorking', value === 'working')}
              className="flex flex-wrap gap-6"
            >
              <label htmlFor="shift-status-working" className="flex cursor-pointer items-center gap-2 text-sm text-[#1F2A30]">
                <RadioGroupItem id="shift-status-working" value="working" className="border-[#4F7284] text-[#4F7284]" />
                Ngày làm việc
              </label>
              <label htmlFor="shift-status-off" className="flex cursor-pointer items-center gap-2 text-sm text-[#1F2A30]">
                <RadioGroupItem id="shift-status-off" value="off" className="border-[#4F7284] text-[#4F7284]" />
                Ngày nghỉ
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Giờ bắt đầu" htmlFor="shift-start">
              <Input
                id="shift-start"
                type="time"
                value={draft.startTime}
                disabled={!isWorking}
                onChange={(event) => update('startTime', event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Giờ kết thúc" htmlFor="shift-end">
              <Input
                id="shift-end"
                type="time"
                value={draft.endTime}
                disabled={!isWorking}
                onChange={(event) => update('endTime', event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field label="Thời gian nghỉ giữa ca (phút)" htmlFor="shift-break">
            <Input
              id="shift-break"
              type="number"
              inputMode="numeric"
              min={0}
              max={720}
              value={isWorking ? draft.breakMinutes : '0'}
              disabled={!isWorking}
              onChange={(event) => update('breakMinutes', event.target.value)}
              className={fieldClass}
            />
          </Field>

          <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-[#5C6670]">Tổng giờ làm chuẩn</span>
            <span className="text-2xl font-semibold tabular-nums text-[#4F7284]">{formatStandardHours(hours)}</span>
            <span className="text-xs text-[#5C6670]">
              {isWorking
                ? `Công thức: (giờ kết thúc - giờ bắt đầu) - ${formatBreakMinutes(Number(draft.breakMinutes) || 0)}${
                    crossesMidnight ? '. Ca qua đêm.' : ''
                  }`
                : 'Ngày nghỉ không tính giờ làm.'}
            </span>
          </div>

          {shownError && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {shownError}
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
            <Button type="submit" disabled={isSaving} className="bg-[#4F7284] text-white hover:bg-[#3F5C6C]">
              {isEdit ? 'Lưu thay đổi' : 'Thêm ca'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
