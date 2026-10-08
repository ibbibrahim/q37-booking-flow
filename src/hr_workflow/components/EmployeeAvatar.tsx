import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  profilePictureUrl?: string | null;
  gender?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
};

const ICON_SIZES: Record<NonNullable<Props['size']>, number> = {
  sm: 22,
  md: 30,
  lg: 48,
};

/** Bold, solid bust silhouettes in the classic male/female pictogram
 * convention (square shoulders vs. a flared dress) — a plain person icon
 * recolored by gender reads as "the same icon twice" at a glance, which
 * defeats the point. Filled rather than outlined so they stay legible at
 * small avatar sizes. */
function MaleSilhouette({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7.5" r="4" />
      <path d="M12 13c-3.6 0-6.5 2.6-6.5 6.5V21h13v-1.5c0-3.9-2.9-6.5-6.5-6.5Z" />
    </svg>
  );
}

function FemaleSilhouette({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7.5" r="4" />
      <path d="M12 13c-1.8 0-3.3.9-4.1 2.4L5.5 21h13l-2.4-5.6c-.8-1.5-2.3-2.4-4.1-2.4Z" />
    </svg>
  );
}

/** A real photo when one's on file; otherwise a bold, gender-specific
 * silhouette (not the same icon merely recolored) — never bare initials.
 * Shared across every employee list/detail view so the same identity
 * treatment appears everywhere. */
export function EmployeeAvatar({ profilePictureUrl, gender, name, size = 'md', className }: Props) {
  const normalizedGender = gender?.trim().toLowerCase();
  const isMale = normalizedGender === 'male';
  const isFemale = normalizedGender === 'female';
  const iconSize = ICON_SIZES[size];

  const genderClasses = isMale
    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
    : isFemale
    ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
    : 'bg-muted text-muted-foreground';

  return (
    <Avatar className={cn(SIZE_CLASSES[size], 'shrink-0', className)}>
      {profilePictureUrl && <AvatarImage src={profilePictureUrl} alt={name} className="object-cover" />}
      <AvatarFallback className={genderClasses}>
        {isMale ? (
          <MaleSilhouette size={iconSize} />
        ) : isFemale ? (
          <FemaleSilhouette size={iconSize} />
        ) : (
          <UserRound size={iconSize} strokeWidth={2} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
