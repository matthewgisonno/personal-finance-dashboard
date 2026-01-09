'use client';

import { Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useTransactionProcessing } from '@/context/TransactionProcessingContext';
import { formatNumber } from '@/lib/utils';

export function CategorizationTray() {
  const { isProcessing, progress, progressValue, pendingCount, completedCount, totalCount } =
    useTransactionProcessing();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const prevProcessingState = useRef(false);
  const router = useRouter();

  // Auto-open when processing starts
  useEffect(() => {
    const currentlyProcessing = isProcessing || pendingCount > 0;

    if (currentlyProcessing && !prevProcessingState.current) {
      // Use timeout to push the state update to the next tick
      setTimeout(() => {
        setIsVisible(true);
        setIsExpanded(true);
      }, 0);
    }

    prevProcessingState.current = currentlyProcessing;
  }, [isProcessing, pendingCount]);

  // Auto-close when processing completes
  useEffect(() => {
    if (completedCount === totalCount && totalCount > 0 && !isProcessing && pendingCount === 0 && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        router.refresh();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalCount, isProcessing, pendingCount, isVisible, router]);

  if (!isVisible && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 shadow-xl transition-all duration-300">
      <Card className="border-t-4 border-t-sidebar-primary overflow-hidden bg-card border-x border-b border-gray-200">
        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin text-sidebar-primary" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}

              <h3 className="font-medium text-sm text-gray-900">
                {isProcessing ? 'Categorizing Transactions' : 'Categorization Complete'}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-gray-900"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-gray-900"
                onClick={() => setIsVisible(false)}
              >
                <span className="sr-only">Close</span>

                <span className="text-xs">✕</span>
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{progress}</span>

                <span>
                  {formatNumber(completedCount)} / {formatNumber(totalCount)}
                </span>
              </div>

              <Progress value={progressValue} className="h-2" />

              {isProcessing && (
                <p className="text-xs text-sidebar-primary animate-pulse">AI is analyzing your transactions...</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
