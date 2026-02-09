import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message, className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 min-h-[200px]',
        className
      )}
    >
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-amber-100/60 text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}
