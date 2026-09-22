import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Every list-row action across the HR module is icon-only (with a tooltip
// for the label) so a row with several actions stays compact. Callers must
// wrap their list in a <TooltipProvider> themselves.
export function ActionIconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  destructive,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={variant}
          disabled={disabled}
          className={cn('h-8 w-8', destructive && 'text-destructive hover:text-destructive hover:bg-destructive/10')}
          onClick={onClick}
          aria-label={label}
        >
          <Icon size={15} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
