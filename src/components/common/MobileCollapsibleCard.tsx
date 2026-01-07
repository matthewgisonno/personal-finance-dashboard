'use client';

import { Minus, Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface MobileCollapsibleCardProps {
  /** Card title/header shown on both mobile and desktop. */
  title: ReactNode;
  /** Card body content. (Do not wrap with `CardContent`; this component does it.) */
  children: ReactNode;

  /** Mobile-only initial state. Defaults to `false` (collapsed). */
  defaultMobileOpen?: boolean;

  /** Class names for styling. */
  className?: string;
  contentClassName?: string;
}

export function MobileCollapsibleCard({
  title,
  children,
  defaultMobileOpen = false,
  className,
  contentClassName
}: MobileCollapsibleCardProps) {
  const header = (
    <CardHeader className="w-full items-center gap-0">
      <CardTitle className="w-full text-left">{title}</CardTitle>
    </CardHeader>
  );

  const body = <CardContent className={cn(contentClassName)}>{children}</CardContent>;

  return (
    <Card className={cn('gap-2 transition-[padding] duration-300', className)}>
      <div className="md:hidden">
        <Collapsible defaultOpen={defaultMobileOpen}>
          <CollapsibleTrigger className="group w-full flex items-center justify-between cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1">
            {header}
            <Plus className="h-4 w-4 mr-4 hidden group-data-[state=closed]:block" />
            <Minus className="h-4 w-4 mr-4 hidden group-data-[state=open]:block" />
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {body}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="hidden md:block">
        {header}
        {body}
      </div>
    </Card>
  );
}
