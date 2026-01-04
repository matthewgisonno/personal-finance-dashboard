'use client';

import { Receipt, Upload, LayoutDashboard, PieChart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils/classNames';

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
      {/* Logo */}
      <div className="flex items-center border-b border-sidebar-border px-6 py-4">
        <div className="flex w-full justify-center items-center">
          <Link href="/">
            <Image src="/finance-flow-logo-sm.png" alt="FinanceFlow" width={159} height={41} loading="eager" />
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <div className="relative h-8 w-8 overflow-hidden rounded-full">
              <Image src={user.avatar} alt={user.name || 'User'} fill sizes="32px" className="object-cover" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-sidebar-accent" />
          )}
          <div className="flex-1 text-sm overflow-hidden">
            <div className="font-medium truncate">{user?.name || 'Guest User'}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email || 'guest@example.com'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
