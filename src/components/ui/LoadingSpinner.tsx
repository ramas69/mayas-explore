import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

interface LoadingSpinnerProps extends React.ComponentProps<'svg'> {
  size?: LoadingSpinnerSize;
}

export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Chargement"
      className={cn('animate-spin text-amber-500', sizeClasses[size], className)}
      {...props}
    />
  );
}
