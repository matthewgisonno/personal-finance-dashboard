import { LayoutDashboard } from 'lucide-react';
import { Suspense } from 'react';

import { AIInsightsWrapper, AIInsightsSkeleton } from '@/components/dashboard';
import { Header } from '@/components/layout';

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        icon={<LayoutDashboard className="h-6 w-6" />}
        description="View your financial insights"
      />

      <Suspense fallback={<AIInsightsSkeleton />}>
        <AIInsightsWrapper />
      </Suspense>
    </>
  );
}
