import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  hint?: string;
  accentClassName?: string;
}

export function StatTile({ label, value, icon: Icon, hint, accentClassName }: StatTileProps) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-card-foreground mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn('shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary', accentClassName)}>
          <Icon size={20} />
        </div>
      </CardContent>
    </Card>
  );
}
