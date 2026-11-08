import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { initialsOf } from '@/lib/initials';

interface UserAvatarProps {
  name: string | null | undefined;
  size?: 'sm' | 'md';
  /** Show the full name in a tooltip on hover. */
  tooltip?: boolean;
  className?: string;
}

export function UserAvatar({ name, size = 'sm', tooltip = false, className }: UserAvatarProps) {
  const circle = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        className
      )}
      aria-label={tooltip ? undefined : (name ?? undefined)}
    >
      {initialsOf(name)}
    </span>
  );

  if (!tooltip || !name) return circle;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{circle}</TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
