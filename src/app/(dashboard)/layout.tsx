import { SpeedInsights } from '@vercel/speed-insights/next';

import { CategorizationTray } from '@/components/dashboard';
import { DashboardLayout } from '@/components/layout';
import { TransactionProcessingProvider } from '@/context/TransactionProcessingContext';
import { getUser } from '@/lib/actions';

export default async function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <TransactionProcessingProvider>
      <DashboardLayout user={user}>
        <div className="space-y-6">{children}</div>
        <CategorizationTray />
        <SpeedInsights />
      </DashboardLayout>
    </TransactionProcessingProvider>
  );
}
