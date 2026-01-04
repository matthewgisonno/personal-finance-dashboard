import { Upload } from 'lucide-react';

import { TransactionImporter } from '@/components/dashboard';
import { Header } from '@/components/layout';
import { db, accounts } from '@/lib/db';

export default async function UploadPage() {
  const accountList = await db.select().from(accounts);

  return (
    <>
      <Header
        title="Upload Transactions"
        icon={<Upload className="h-6 w-6" />}
        description="Import your bank transactions from a CSV file"
      />

      <TransactionImporter accounts={accountList} />
    </>
  );
}
