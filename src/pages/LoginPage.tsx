import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader as Loader2 } from 'lucide-react';
import { HotelPickerDialog } from '@/features/auth/components/HotelPickerDialog';
import { useAuth } from '@/features/auth/AuthProvider';
import { requiresHotelPicker, type AuthAccount, type HotelRef } from '@/features/auth/authRules';
import { fetchAccountHotels, signInWithUsername } from '@/features/auth/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/layout/Logo';

interface PendingLogin {
  account: AuthAccount;
  token: string;
  hotels: HotelRef[];
}

export function LoginPage() {
  const { session, startSession } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLogin | null>(null);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { account, token } = await signInWithUsername(username, password);
      const hotels = await fetchAccountHotels(account);
      if (hotels.length === 0) {
        throw new Error('Tài khoản chưa được gán cho khách sạn nào.');
      }
      if (requiresHotelPicker(account, hotels)) {
        setPending({ account, token, hotels });
      } else {
        startSession(account, hotels[0], token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-lg sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <Logo className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold leading-[1.2] text-[#4F7284]">OMS by Jenius</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-username" className="text-sm font-medium text-[#334155]">
              Tài khoản
            </Label>
            <Input
              id="login-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 border-[#E2E8F0] bg-white text-[#0F172A] focus-visible:ring-[#4F7284]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-sm font-medium text-[#334155]">
              Mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 border-[#E2E8F0] bg-white pr-11 text-[#0F172A] focus-visible:ring-[#4F7284]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] transition-colors duration-200 hover:text-[#0F172A]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#4F7284] text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#3F5C6C] hover:shadow-md active:scale-[0.99] disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Đăng nhập
          </Button>
        </form>
      </div>

      {pending ? (
        <HotelPickerDialog
          hotels={pending.hotels}
          onSelect={(hotel) => {
            setPending(null);
            startSession(pending.account, hotel, pending.token);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
