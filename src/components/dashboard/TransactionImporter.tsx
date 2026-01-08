'use client';

import { CheckCircle, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { useState } from 'react';

import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/Field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useTransactionProcessing } from '@/context/TransactionProcessingContext';
import { cn } from '@/lib/utils';

import { TransactionProcessingStats } from './TransactionProcessingStats';

import type { IngestInputType } from '@/lib/schemas/types';

const REQUIRED_COLUMNS = {
  date: ['date', 'posted date', 'time'],
  description: ['description', 'desc', 'memo', 'merchant'],
  amount: ['amount', 'amt', 'value']
};

interface Account {
  id: string;
  name: string;
}

interface TransactionImporterProps {
  accounts: Account[];
}

export function TransactionImporter({ accounts }: TransactionImporterProps) {
  const { transactions, checkPending } = useTransactionProcessing();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(accounts[0]?.id || undefined);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const pendingTransactions = transactions.filter(t => t.categoryStatus === 'pending');

  const processFile = (file: File) => {
    setUploading(true);
    setUploadStatus('Parsing CSV...');
    setError(null);

    // Parse the CSV file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        const headers = results.meta.fields || [];
        const normalizedHeaders = headers.map(h => h.toLowerCase());

        const hasColumn = (aliases: string[]) => aliases.some(alias => normalizedHeaders.includes(alias));

        const missingColumns: string[] = [];
        if (!hasColumn(REQUIRED_COLUMNS.date)) missingColumns.push('Date');
        if (!hasColumn(REQUIRED_COLUMNS.description)) missingColumns.push('Description');
        if (!hasColumn(REQUIRED_COLUMNS.amount)) missingColumns.push('Amount');

        if (missingColumns.length > 0) {
          setError(
            `Missing required columns: ${missingColumns.join(', ')}. Please ensure your CSV contains these columns (or their aliases).`
          );
          setUploading(false);
          return;
        }

        // Find the keys in the row
        const findValue = (row: Record<string, string>, keys: string[]) => {
          const rowKeys = Object.keys(row);
          // O(k) where k = number of keys in the row
          for (const k of keys) {
            const match = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
            if (match) {
              return row[match];
            }
          }
          return null;
        };

        // Map the rows to the IngestInputType['transactions'] type
        // O(n) where n = number of rows in the CSV
        const rawData: IngestInputType['transactions'] = results.data.map((row, index) => {
          const typedRow = row as Record<string, string>;
          const desc = findValue(typedRow, REQUIRED_COLUMNS.description) || 'Unknown';
          const amountStr = findValue(typedRow, REQUIRED_COLUMNS.amount) || '0';
          const dateStr = findValue(typedRow, REQUIRED_COLUMNS.date) || new Date().toISOString();

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      processFile(file);
    } else if (file) {
      alert('Please upload a CSV file.');
    }
  };

  const processTransactions = async (rawData: IngestInputType['transactions']) => {
    setUploadStatus('Starting upload...');

    const BATCH_SIZE = 2500;
    const total = rawData.length;

    try {
      // O(n) where n = number of transactions
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rawData.slice(i, i + BATCH_SIZE);
        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);

        setUploadStatus(
          `Uploading and securely saving your transactions (Batch ${currentBatchNum} of ${totalBatches})...`
        );

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
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-200 border-border bg-muted/50',
          {
            'border-primary bg-primary/10': isDragging
          }
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2 className="text-xl font-bold mb-2 text-foreground">Import Transactions</h2>

        <div className="mb-4 text-left max-w-md mx-auto">
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel>Select Account:</FieldLabel>

                <Select
                  value={selectedAccountId}
                  onValueChange={value => setSelectedAccountId(value)}
                  disabled={uploading}
                >
                  <SelectTrigger className="h-8 w-50 bg-card" aria-label="Select Account">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>

                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          </div>
          <p className="text-sm text-muted-foreground">Upload a CSV with columns: Date, Description, Amount</p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            aria-label="Upload CSV file"
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          />
        </div>

        {/* Upload Status */}
        {uploading && <p className="mt-4 text-sm text-primary animate-pulse">{uploadStatus}</p>}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md text-left border border-red-200">
            <p className="font-semibold mb-2">{error}</p>
            <p className="font-medium text-sm mb-1">Accepted Column Names:</p>
            <ul className="list-disc pl-4 text-sm space-y-0.5">
              <li>
                <span className="font-bold">Date:</span> {REQUIRED_COLUMNS.date.join(', ')}
              </li>
              <li>
                <span className="font-bold">Description:</span> {REQUIRED_COLUMNS.description.join(', ')}
              </li>
              <li>
                <span className="font-bold">Amount:</span> {REQUIRED_COLUMNS.amount.join(', ')}
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Processing Stats */}
      {pendingTransactions.length > 0 && <TransactionProcessingStats transactions={transactions} />}

      {/* Success Message */}
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
