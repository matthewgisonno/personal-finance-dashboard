'use client';

import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Header({ title, icon, description, action, className }: HeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 px-4 py-4 md:px-8 mb-8',
        'bg-card border-b border-border/40 shadow-sm',
        'flex flex-col gap-1 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {icon && <span className="text-muted-foreground/70">{icon}</span>}
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
