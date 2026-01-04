import { LayoutDashboard } from 'lucide-react';

import { AIInsights } from '@/components/dashboard';
import { Header } from '@/components/layout';

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        icon={<LayoutDashboard className="h-6 w-6" />}
        description="View your financial insights"
      />

      <AIInsights />
    </>
  );
}
