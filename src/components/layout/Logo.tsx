import { useId } from 'react';

import { cn } from '@/lib/utils';

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const jGrad = `${uid}-j-grad`;
  const barGrad = `${uid}-bar-grad`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('flex-shrink-0', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="OMS by Jenius logo"
    >
      <defs>
        <linearGradient id={jGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7E36" />
          <stop offset="50%" stopColor="#FF3E3D" />
          <stop offset="100%" stopColor="#C8102E" />
        </linearGradient>
        <linearGradient id={barGrad} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A154B" />
          <stop offset="50%" stopColor="#8A2BE2" />
          <stop offset="100%" stopColor="#E024A2" />
        </linearGradient>
      </defs>
      <path
        d="M90 12 H40 C20 12 8 28 8 50 C8 75 28 92 55 92 C78 92 90 75 90 50 L90 20 H80 L80 50 C80 68 70 82 53 82 C34 82 20 68 20 50 C20 33 30 22 45 22 H90 V12 Z"
        fill={`url(#${jGrad})`}
      />
      <rect x="28" y="52" width="9" height="20" rx="2" transform="rotate(-15 28 52)" fill={`url(#${barGrad})`} />
      <rect x="42" y="40" width="10" height="32" rx="2" transform="rotate(-15 42 40)" fill={`url(#${barGrad})`} />
      <rect x="57" y="28" width="11" height="44" rx="2" transform="rotate(-15 57 28)" fill={`url(#${barGrad})`} />
    </svg>
  );
}
