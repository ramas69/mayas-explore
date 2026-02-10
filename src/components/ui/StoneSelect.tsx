/**
 * Sélecteur déroulant stylé Maya — fond sombre, accents dorés.
 * Remplace les <select> natifs dont le menu est rendu par le système (style incohérent).
 */
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StoneSelectOption {
  value: string;
  label: string;
}

interface StoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: StoneSelectOption[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  required?: boolean;
}

const stoneTrigger = cn(
  'flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-amber-100',
  'bg-slate-900/50 border border-amber-500/20 transition-colors',
  'hover:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[placeholder]:text-amber-100/50'
);

const stoneContent = cn(
  'relative z-50 max-h-60 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl',
  'bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-xl',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[side=bottom]:slide-in-from-top-2'
);

const stoneItem = cn(
  'relative flex w-full cursor-pointer select-none items-center py-2.5 pl-3 pr-9 text-sm outline-none',
  'text-amber-100 rounded-lg mx-1 transition-colors',
  'focus:bg-amber-500/20 focus:text-amber-100',
  'data-[highlighted]:bg-amber-500/20 data-[highlighted]:text-amber-100',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
);

export function StoneSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Choisir…',
  className,
  size = 'default',
  disabled = false,
  required = false,
}: StoneSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} required={required} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          stoneTrigger,
          size === 'sm' && 'py-2 text-sm',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-400/70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className={stoneContent} position="popper" sideOffset={4} align="start">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} className={stoneItem}>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-amber-400" />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
