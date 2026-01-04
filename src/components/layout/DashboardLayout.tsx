'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useMobile } from '@/lib/hooks';
import { cn } from '@/lib/utils/classNames';

import { Sidebar } from './Sidebar';

import type React from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 border-r border-sidebar-border md:block">
        <Sidebar user={user} />
      </aside>

      {/* Sidebar - Mobile Overlay */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
              sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Button
              variant="secondary"
              size="icon"
              className="right-4 top-4 absolute cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Sliding Sidebar */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-sidebar-border transition-transform duration-300 ease-in-out md:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <Sidebar user={user} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Toggle */}
        <div className="flex h-16 items-center gap-2 border-b border-border bg-background p-4 md:hidden">
          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <Link href="/">
            <Image src="/finance-flow-logo-sm.png" alt="FinanceFlow" width={159} height={41} loading="eager" />
          </Link>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
