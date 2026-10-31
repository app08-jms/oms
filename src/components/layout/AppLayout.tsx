import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Toaster } from '@/components/ui/toaster';
import { findNavItem } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthProvider';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { permissions, permissionsError } = useAuth();
  const navItem = findNavItem(pathname);
  const isBlocked = navItem !== undefined && permissions !== null && !permissions[navItem.featureKey].view;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader onOpenMenu={() => setMobileMenuOpen(true)} />
      <div className="flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {permissionsError ? (
            <p role="alert" className="py-16 text-center text-sm text-error">
              {permissionsError}
            </p>
          ) : permissions === null ? (
            <p className="py-16 text-center text-sm text-[#64748B]">Đang tải quyền truy cập...</p>
          ) : isBlocked ? (
            <p className="py-16 text-center text-sm text-[#64748B]">
              Bạn không có quyền truy cập trang này.
            </p>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <MobileNavDrawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      <Toaster />
    </div>
  );
}
