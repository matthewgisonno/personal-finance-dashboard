'use client';

import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useState } from 'react';

import { useTransactionProcessing } from '@/context/TransactionProcessingContext';
import { IngestInput } from '@/lib/schemas';

import { TransactionImporterDisplay } from './TransactionImporterDisplay';

interface Account {
  id: string;
  name: string;
}

interface TransactionImporterProps {
  accounts: Account[];
}

export function TransactionImporter({ accounts }: TransactionImporterProps) {
  const { transactions, checkPending } = useTransactionProcessing();
  const pendingTransactions = transactions.filter(t => t.categoryStatus === 'pending');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(accounts[0]?.id || undefined);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadStatus('Parsing CSV...');

    // Parse the CSV file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        // Find the keys in the row
        const findValue = (row: Record<string, string>, keys: string[]) => {
          const rowKeys = Object.keys(row);
          // O(k) where k = number of keys in the row
          for (const k of keys) {
            const match = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
            if (match) return row[match];
          }
          return null;
        };

        // Map the rows to the IngestInput['transactions'] type
        // O(n) where n = number of rows in the CSV
        const rawData: IngestInput['transactions'] = results.data.map((row, index) => {
          const typedRow = row as Record<string, string>;
          const desc = findValue(typedRow, ['description', 'desc', 'memo', 'merchant']) || 'Unknown';
          const amountStr = findValue(typedRow, ['amount', 'amt', 'value']) || '0';
          const dateStr = findValue(typedRow, ['date', 'posted date', 'time']) || new Date().toISOString();

          return {
            id: `temp_${Date.now()}_${index}`,
            date: dateStr,
            description: desc,
            amount: parseFloat(amountStr.replace(/[^0-9.-]+/g, ''))
          };
        });

        // Process the transactions
        await processTransactions(rawData);
      }
    });
  };

  const processTransactions = async (rawData: IngestInput['transactions']) => {
    setUploadStatus('Starting upload...');

    const BATCH_SIZE = 2500;
    const total = rawData.length;

    try {
      // O(n) where n = number of transactions
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rawData.slice(i, i + BATCH_SIZE);
        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);

        setUploadStatus(`Uploading and securely saving your transactions (${currentBatchNum} of ${totalBatches})...`);

        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: batch, accountId: selectedAccountId })
        });

        if (!res.ok) throw new Error(`Batch ${currentBatchNum} failed`);
      }

      // Trigger global processing to pick up the new pending items
      await checkPending();

      setUploadStatus('Upload complete! Processing with AI started.');
      setUploading(false);
    } catch (err) {
      console.error(err);
      setUploadStatus('Error uploading.');
      setUploading(false);
    }
  };

  return (
    <>
      <div className="border-2 border-dashed border-border rounded-lg p-10 text-center bg-muted/50">
        <h2 className="text-xl font-bold mb-2 text-foreground">Import Transactions</h2>

        {/* ACCOUNT SELECTOR */}
        <div className="mb-4 text-left max-w-md mx-auto">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Select Account</label>

          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            disabled={uploading}
            className="block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring sm:text-sm p-2 border disabled:opacity-50"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* INPUT STATE */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Upload a CSV with columns: Date, Description, Amount</p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* UPLOAD STATUS */}
        {uploading && <p className="mt-4 text-sm text-primary animate-pulse">{uploadStatus}</p>}
      </div>

      {/* DATA TABLE - Only show when there are pending transactions */}
      {pendingTransactions.length > 0 && <TransactionImporterDisplay data={pendingTransactions} />}

      {/* SUCCESS MESSAGE - Show when all transactions are categorized */}
      {!uploading && transactions.length > 0 && pendingTransactions.length === 0 && (
        <div className="bg-card shadow rounded-lg p-10 text-center border border-border">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-medium text-foreground">All transactions categorized</h3>

              <p className="text-muted-foreground">
                All transactions have been categorized. Upload more transactions to proceed.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
