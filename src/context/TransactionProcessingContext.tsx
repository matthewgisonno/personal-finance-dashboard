'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

import { formatNumber } from '@/lib/utils';

import type { CategorizedTransactionType } from '@/lib/services/types';

interface TransactionProcessingContextType {
  transactions: CategorizedTransactionType[];
  isProcessing: boolean;
  progress: string;
  progressValue: number;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  checkPending: () => Promise<void>;
}

const TransactionProcessingContext = createContext<TransactionProcessingContextType | undefined>(undefined);

export function TransactionProcessingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<CategorizedTransactionType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const processingRef = useRef(false);
  const transactionsRef = useRef(transactions);

  // Keep ref in sync
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Derived state
  const totalCount = transactions.length;
  // O(n) where n = total transactions
  const completedCount = transactions.filter(t => t.categoryStatus === 'completed').length;
  const progressValue = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;
  // O(n)
  const pendingCount = transactions.filter(t => t.categoryStatus === 'pending').length;

  const runBatch = async (batch: CategorizedTransactionType[], retryCount = 0) => {
    try {
      const res = await fetch('/api/categorize-ai', {
        method: 'POST',
        body: JSON.stringify({ transactions: batch })
      });

      if (!res.ok) throw new Error('Failed to fetch AI batch');

      const { categorizations } = await res.json();

      setTransactions(prev => {
        const next = [...prev];
        // O(b * n) where b = batch size (10) and n = total transactions
        // (Iterating batch, then linear search for each item)
        categorizations.forEach((cat: { i: string; t: string; n: number }) => {
          const index = next.findIndex(t => t.id === cat.i);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              category: cat.t,
              categoryConfidence: cat.n.toString(),
              categorySource: 'ai',
              categoryStatus: 'completed'
            } as CategorizedTransactionType;
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Batch failed', error);
      if (retryCount < 3) {
        const delay = 1000 * (retryCount + 1);
        await new Promise(r => setTimeout(r, delay));
        return runBatch(batch, retryCount + 1);
      }

      // Mark as failed
      setTransactions(prev => {
        const next = [...prev];
        batch.forEach(t => {
          const index = next.findIndex(nt => nt.id === t.id);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              category: 'Uncategorized',
              categoryConfidence: '0',
              categorySource: 'error',
              categoryStatus: 'completed'
            } as CategorizedTransactionType;
          }
        });
        return next;
      });
    }
  };

  const processBackgroundBatches = async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    const BATCH_SIZE = 10;
    const CONCURRENCY_LIMIT = 50;

    // Loop until no pending items remain
    // Total complexity: O(P) where P = pending transactions (processed in parallel batches)
    while (true) {
      // Get fresh pending list from ref
      const pending = transactionsRef.current.filter(t => t.categoryStatus === 'pending');

      if (pending.length === 0) {
        break;
      }

      setProgress(`Processing ${formatNumber(pending.length)} remaining items...`);

      // Grab a chunk large enough for all concurrent workers
      const chunk = pending.slice(0, BATCH_SIZE * CONCURRENCY_LIMIT);

      // Split into batches
      const batches = [];
      for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
        batches.push(chunk.slice(i, i + BATCH_SIZE));
      }

      // Run this group of batches in parallel
      await Promise.all(batches.map(batch => runBatch(batch)));

      // Loop will continue and check transactionsRef again
    }

    setProgress('All Done!');
    setIsProcessing(false);
    processingRef.current = false;
  };

  const checkPending = useCallback(async () => {
    try {
      // Only fetch pending items for background categorization/progress.
      // This prevents progress from counting already-completed historical transactions.
      const res = await fetch('/api/transactions?status=pending');
      const { data } = await res.json();
      const typedData = data as CategorizedTransactionType[];

      setTransactions(typedData);
    } catch (err) {
      console.error('Failed to check pending transactions', err);
    }
  }, []);

  // Trigger effect to start processing when transactions change
  // When transactions change, if we have pending and not running, start.
  useEffect(() => {
    const pending = transactions.filter(t => t.categoryStatus === 'pending');
    if (pending.length > 0 && !processingRef.current) {
      processBackgroundBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  // Initial check
  useEffect(() => {
    checkPending();
  }, [checkPending]);

  return (
    <TransactionProcessingContext.Provider
      value={{
        transactions,
        isProcessing,
        progress,
        progressValue,
        pendingCount,
        completedCount,
        totalCount,
        checkPending
      }}
    >
      {children}
    </TransactionProcessingContext.Provider>
  );
}

export function useTransactionProcessing() {
  const context = useContext(TransactionProcessingContext);
  if (context === undefined) {
    throw new Error('useTransactionProcessing must be used within a TransactionProcessingProvider');
  }
  return context;
}
