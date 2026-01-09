import { Upload } from 'lucide-react';

import { Header, PageContainer } from '@/components/layout';
import { db, accounts } from '@/lib/db';

import { TransactionImporter } from '@/components/upload';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const accountList = await db.select().from(accounts);

  return (
    <>
      <Header
        title="Upload Transactions"
        icon={<Upload className="h-6 w-6" />}
        description="Import your bank transactions from a CSV file"
      />

      <PageContainer>
        <TransactionImporter accounts={accountList} />
      </PageContainer>
    </>
  );
}
