import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSessionExpired, SESSION_DURATION_MS, type AuthAccount, type HotelRef, type StoredSession } from '@/features/auth/authRules';
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/features/auth/authStorage';
import { AuthContext, type AuthContextValue } from '@/features/auth/authContext';
import { fetchEffectivePermissions, logoutAppUser } from '@/features/auth/authService';
import { SUPER_ADMIN_ROLE_KEY, type PermissionGrid } from '@/features/permissions/permissionRules';

function loadInitialSession(): StoredSession | null {
  const stored = readStoredSession();
  if (!stored) return null;
  if (isSessionExpired(stored)) {
    clearStoredSession();
    return null;
  }
  return stored;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(loadInitialSession);
  const [permissions, setPermissions] = useState<PermissionGrid | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsRevision, setPermissionsRevision] = useState(0);
  const [viewerRoleOverride, setViewerRoleOverrideState] = useState<string | null>(null);

  const logout = useCallback(() => {
    if (session) void logoutAppUser(session.token);
    clearStoredSession();
    setSession(null);
    setViewerRoleOverrideState(null);
  }, [session]);

  const setViewerRoleOverride = useCallback(
    (roleKey: string | null) => {
      if (session?.account.roleKey !== SUPER_ADMIN_ROLE_KEY) return;
      setViewerRoleOverrideState(roleKey);
    },
    [session],
  );

  const startSession = useCallback((account: AuthAccount, hotel: HotelRef, token: string) => {
    const next: StoredSession = { account, hotel, token, expiresAt: Date.now() + SESSION_DURATION_MS };
    writeStoredSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, logout]);

  const refreshPermissions = useCallback(() => setPermissionsRevision((revision) => revision + 1), []);

  useEffect(() => {
    if (!session) {
      setPermissions(null);
      setPermissionsError(null);
      return;
    }
    let active = true;
    setPermissionsError(null);
    fetchEffectivePermissions(session.account)
      .then((grid) => {
        if (active) setPermissions(grid);
      })
      .catch((error: unknown) => {
        if (active) setPermissionsError(error instanceof Error ? error.message : 'Không thể tải quyền truy cập.');
      });
    return () => {
      active = false;
    };
  }, [session, permissionsRevision]);

  const value = useMemo(
    () => ({
      session,
      permissions,
      permissionsError,
      refreshPermissions,
      viewerRoleOverride,
      setViewerRoleOverride,
      startSession,
      logout,
    }),
    [session, permissions, permissionsError, refreshPermissions, viewerRoleOverride, setViewerRoleOverride, startSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useSession(): StoredSession {
  const { session } = useAuth();
  if (!session) throw new Error('useSession must be used inside an authenticated route');
  return session;
}

export function useViewerRole(): { roleKey: string; setRoleKey: (roleKey: string | null) => void } {
  const { session, viewerRoleOverride, setViewerRoleOverride } = useAuth();
  if (!session) throw new Error('useViewerRole must be used inside an authenticated route');
  return {
    roleKey: viewerRoleOverride ?? session.account.roleKey,
    setRoleKey: setViewerRoleOverride,
  };
}
