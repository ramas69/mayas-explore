/**
 * Boîte de dialogue de confirmation stylée Maya (supprimer, modifier, etc.)
 */
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="stone-card border-amber-500/30 bg-slate-900/95 backdrop-blur-xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-amber-100 font-['Cinzel_Decorative']">
            {variant === 'danger' ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </span>
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </span>
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-amber-100/70">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:gap-2">
          <AlertDialogCancel className="bg-slate-800 text-amber-100 border-amber-500/20 hover:bg-slate-700 hover:text-amber-50">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
            className={
              variant === 'danger'
                ? 'bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500'
                : 'bg-amber-500 text-slate-900 hover:bg-amber-400 focus:ring-amber-500'
            }
          >
            {isLoading ? 'En cours...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
