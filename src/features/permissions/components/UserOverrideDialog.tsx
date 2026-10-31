import { useCallback, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCatalogResource } from '@/hooks/useCatalogResource';
import { PermissionMatrix } from '@/features/permissions/components/PermissionMatrix';
import {
  applyOverrides,
  overrideKey,
  type FeatureKey,
  type OverrideMap,
  type PermissionAction,
  type PermissionGrid,
} from '@/features/permissions/permissionRules';
import { fetchUserPermissionContext, saveUserOverrides } from '@/features/permissions/permissionService';

const LOAD_ERROR = 'Không thể tải quyền của tài khoản này.';

interface UserOverrideDialogProps {
  userSystemUid: string;
  username: string;
  roleKey: string;
  onClose: () => void;
}

export function UserOverrideDialog({ userSystemUid, username, roleKey, onClose }: UserOverrideDialogProps) {
  const loadContext = useCallback(
    () => fetchUserPermissionContext(userSystemUid, roleKey),
    [userSystemUid, roleKey],
  );
  const context = useCatalogResource(loadContext, LOAD_ERROR);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-3xl sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">
            Cấu hình quyền riêng lẻ cho {username}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Quyền theo vai trò được giữ nguyên. Chỉ các ô đã chỉnh riêng mới được ghi đè cho tài khoản này.
          </DialogDescription>
        </DialogHeader>

        {context.loadError && (
          <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            {context.loadError}
          </p>
        )}

        {!context.data && !context.loadError && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C6670]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải quyền của tài khoản...
          </div>
        )}

        {context.data && (
          <OverrideEditor
            key={userSystemUid}
            username={username}
            userSystemUid={userSystemUid}
            inherited={context.data.inherited}
            initialOverrides={context.data.overrides}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface OverrideEditorProps {
  userSystemUid: string;
  username: string;
  inherited: PermissionGrid;
  initialOverrides: OverrideMap;
  onClose: () => void;
}

function OverrideEditor({ userSystemUid, username, inherited, initialOverrides, onClose }: OverrideEditorProps) {
  const [overrides, setOverrides] = useState<OverrideMap>(initialOverrides);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const effective = applyOverrides(inherited, overrides);
  const customCount = Object.keys(overrides).length;

  function toggleCell(feature: FeatureKey, action: PermissionAction) {
    const nextValue = !effective[feature][action];
    const key = overrideKey(feature, action);
    setOverrides((current) => {
      const next = { ...current };
      if (nextValue === inherited[feature][action]) {
        delete next[key];
      } else {
        next[key] = nextValue ? 'grant' : 'revoke';
      }
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await saveUserOverrides(userSystemUid, overrides);
      toast({ title: 'Đã lưu quyền riêng lẻ', description: `Quyền riêng của ${username} đã được cập nhật.` });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu quyền riêng lẻ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#1F2A30]">
          {customCount === 0
            ? 'Tài khoản đang dùng hoàn toàn quyền theo vai trò.'
            : `${customCount} quyền đang được chỉnh riêng cho tài khoản này.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOverrides({})}
          disabled={isSaving || customCount === 0}
          className="h-8 w-fit border-[#E2E8F0] text-[#1F2A30]"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Khôi phục theo vai trò
        </Button>
      </div>

      <PermissionMatrix grid={effective} inheritedGrid={inherited} onToggle={toggleCell} />

      {errorMessage && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {errorMessage}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-[#E2E8F0] text-[#1F2A30]">
          Hủy
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="bg-[#4F7284] text-white hover:bg-[#406273]"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu quyền riêng lẻ
        </Button>
      </DialogFooter>
    </div>
  );
}
