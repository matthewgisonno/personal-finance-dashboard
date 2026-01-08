'use client';

import { Receipt, Upload, LayoutDashboard, PieChart, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: PieChart }
];

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface AppSidebarProps {
  onNavigate?: () => void;
  user?: User | null;
}

export function Sidebar({ onNavigate, user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-6">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2" title="Navigate to Dashboard">
          <div className="relative h-8 w-32">
            <Image src="/finance-flow-logo-sm.png" alt="FinanceFlow" fill className="object-contain" loading="eager" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navigation.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 mt-auto">
        <button
          className="w-full flex items-center gap-3 rounded-xl bg-sidebar-accent p-3 hover:bg-sidebar-accent transition-colors cursor-pointer group text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="User settings"
        >
          {user?.avatar ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-sidebar-border group-hover:ring-sidebar-ring/50 transition-all">
              <Image src={user.avatar} alt="" fill sizes="36px" className="object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
              {user?.name?.[0] || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground">{user?.name || 'Guest User'}</div>
            <div className="text-xs text-sidebar-foreground/70">{user?.email || 'guest@example.com'}</div>
          </div>
          <Settings className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
}
