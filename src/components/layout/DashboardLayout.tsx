'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useFocusTrap } from '@/hooks';
import { cn } from '@/lib/utils';

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
  const sidebarRef = useFocusTrap(sidebarOpen, () => setSidebarOpen(false));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-72 shrink-0 bg-sidebar border-r border-sidebar-border md:block z-30">
        <Sidebar user={user} />
      </aside>

      {/* Sidebar - Mobile Overlay */}
      <div className={cn('md:hidden', !sidebarOpen && 'pointer-events-none')} aria-hidden={!sidebarOpen}>
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Sliding Sidebar */}
        <aside
          ref={sidebarRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 transform bg-sidebar border-r border-sidebar-border shadow-2xl transition-transform duration-300 ease-in-out -translate-x-full',
            { 'translate-x-0': sidebarOpen }
          )}
          inert={!sidebarOpen ? true : false}
        >
          <div className="absolute right-4 top-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Sidebar user={user} onNavigate={() => setSidebarOpen(false)} />
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header Toggle */}
        <div className="flex h-14 items-center gap-3 border-b border-border bg-white px-4 md:hidden z-20 sticky top-0 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 text-foreground/70 hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <Link href="/">
            <Image src="/finance-flow-logo-sm.png" alt="FinanceFlow" width={159} height={41} loading="eager" />
          </Link>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-background scroll-smooth">{children}</main>
      </div>
    </div>
  );
}
