import { createContext } from 'react';
import type { AuthAccount, HotelRef, StoredSession } from '@/features/auth/authRules';
import type { PermissionGrid } from '@/features/permissions/permissionRules';

export interface AuthContextValue {
  session: StoredSession | null;
  permissions: PermissionGrid | null;
  permissionsError: string | null;
  refreshPermissions: () => void;
  viewerRoleOverride: string | null;
  setViewerRoleOverride: (roleKey: string | null) => void;
  startSession: (account: AuthAccount, hotel: HotelRef, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
