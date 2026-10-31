import { useState } from 'react';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog';
import { useAuth, useSession } from '@/features/auth/AuthProvider';

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export function UserMenu() {
  const { account, hotel } = useSession();
  const { logout } = useAuth();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2 text-foreground" aria-label="Tài khoản">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initialsOf(account.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left md:block">
              <span className="block text-sm font-medium leading-tight">{account.fullName}</span>
              <span className="block text-xs text-muted-foreground">{hotel.name}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium text-foreground">{account.fullName}</p>
            <p className="text-xs text-muted-foreground">{hotel.name}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsPasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
            Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
    </>
  );
}
