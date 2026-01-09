import { SpeedInsights } from '@vercel/speed-insights/next';

import { CategorizationTray } from '@/components/common';
import { DashboardLayout } from '@/components/layout';
import { TransactionProcessingProvider } from '@/context/TransactionProcessingContext';
import { getUser } from '@/lib/actions';

export default async function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <TransactionProcessingProvider>
      <DashboardLayout user={user}>
        {children}
        <CategorizationTray />
        <SpeedInsights />
      </DashboardLayout>
    </TransactionProcessingProvider>
  );
}
