'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

import type { CategorizedTransaction } from '@/lib/services/types';

interface TransactionProcessingContextType {
  transactions: CategorizedTransaction[];
  isProcessing: boolean;
  progress: string; // Text description
  progressValue: number; // 0-100
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  checkPending: () => Promise<void>;
}

const TransactionProcessingContext = createContext<TransactionProcessingContextType | undefined>(undefined);

export function TransactionProcessingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
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
  const completedCount = transactions.filter(t => t.categoryStatus === 'completed').length;
  const progressValue = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;
  const pendingCount = transactions.filter(t => t.categoryStatus === 'pending').length;

  const runBatch = async (batch: CategorizedTransaction[], retryCount = 0) => {
    try {
      const res = await fetch('/api/categorize-ai', {
        method: 'POST',
        body: JSON.stringify({ transactions: batch })
      });

      if (!res.ok) throw new Error('Failed to fetch AI batch');

      const { categorizations } = await res.json();

      setTransactions(prev => {
        const next = [...prev];
        categorizations.forEach((cat: { id: string; category: string; confidence: number }) => {
          const index = next.findIndex(t => t.id === cat.id);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              category: cat.category,
              categoryConfidence: cat.confidence.toString(),
              categorySource: 'ai',
              categoryStatus: 'completed'
            } as CategorizedTransaction;
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
            } as CategorizedTransaction;
          }
        });
        return next;
      });
    }
  };

  const processBackgroundBatches = async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);

    const BATCH_SIZE = 20;
    const CONCURRENCY_LIMIT = 5;

    // Loop until no pending items remain
    while (true) {
      // Get fresh pending list from ref
      const pending = transactionsRef.current.filter(t => t.categoryStatus === 'pending');

      if (pending.length === 0) {
        break;
      }

      setProgress(`Processing ${pending.length.toLocaleString()} remaining items...`);

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
      const res = await fetch('/api/transactions');
      const { data } = await res.json();
      const typedData = data as CategorizedTransaction[];

      setTransactions(typedData);

      // Trigger processing logic - it handles its own locking
      // We call it here so if we just loaded pending items, we start.
      // If we are already running, the loop inside processBackgroundBatches will pick up the new items (via ref).
      // However, we need to make sure we invoke it if it wasn't running.
      // Since processBackgroundBatches is not in the dependency array (to avoid cycle), we need a way to call it.
      // We can define it inside the component scope (which it is) and call it.
      // But we can't call it easily from useCallback if it's not memoized or stable.
      // Actually, checkPending is useCallback... processBackgroundBatches uses refs so it's stable-ish but not wrapped.
      // Let's make processBackgroundBatches a ref or useCallback?
      // Or just not wrap checkPending in useCallback? It's used in useEffect.
    } catch (err) {
      console.error('Failed to check pending transactions', err);
    }
  }, []);

  // We need to call processBackgroundBatches when transactions update?
  // No, checking every update is too much.
  // We want to call it explicitly after checkPending updates state.
  // So let's move processBackgroundBatches definition inside checkPending? No.

  // Let's use a trigger effect.
  useEffect(() => {
    const pending = transactions.filter(t => t.categoryStatus === 'pending');
    if (pending.length > 0 && !processingRef.current) {
      processBackgroundBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]); // When transactions change, if we have pending and not running, start.

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
