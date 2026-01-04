'use client';

import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useState } from 'react';
import { Fragment } from 'react';

import { useTransactionProcessing } from '@/context/TransactionProcessingContext';

import { Table, TableHeaders, TableRows } from '../ui/Table';

import type { TransactionInput } from '@/lib/services/types';

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
          for (const k of keys) {
            const match = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
            if (match) return row[match];
          }
          return null;
        };

        // Map the rows to the TransactionInput type
        const rawData: TransactionInput[] = results.data.map((row, index) => {
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

  const processTransactions = async (rawData: TransactionInput[]) => {
    setUploadStatus('Starting upload...');
    const BATCH_SIZE = 500;
    const total = rawData.length;

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rawData.slice(i, i + BATCH_SIZE);
        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);

        setUploadStatus(`Uploading batch ${currentBatchNum} of ${totalBatches}...`);

        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: batch, accountId: selectedAccountId })
        });

        if (!res.ok) throw new Error(`Batch ${currentBatchNum} failed`);
      }

      // Trigger global processing to pick up the new pending items
      await checkPending();

      setUploadStatus('Upload complete! Processing started.');
      setUploading(false);
    } catch (err) {
      console.error(err);
      setUploadStatus('Error uploading.');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Import Transactions</h2>

        {/* ACCOUNT SELECTOR */}
        <div className="mb-4 text-left max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Account</label>

          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            disabled={uploading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:opacity-50"
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
          <p className="text-sm text-gray-500">Upload a CSV with columns: Date, Description, Amount</p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* UPLOAD STATUS */}
        {uploading && <p className="mt-4 text-sm text-blue-600 animate-pulse">{uploadStatus}</p>}
      </div>

      {/* DATA TABLE - Only show when there are pending transactions */}
      {pendingTransactions.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <Fragment key="table">
                <TableHeaders headers={['Date', 'Description', 'Category', 'Source', 'Amount']} />

                <TableRows rows={pendingTransactions} />
              </Fragment>
            </Table>
          </div>
        </div>
      )}

      {/* SUCCESS MESSAGE - Show when all transactions are categorized */}
      {!uploading && transactions.length > 0 && pendingTransactions.length === 0 && (
        <div className="bg-white shadow rounded-lg p-10 text-center border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900">All transactions categorized</h3>

              <p className="text-gray-500">
                All transactions have been categorized. Upload more transactions to proceed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
