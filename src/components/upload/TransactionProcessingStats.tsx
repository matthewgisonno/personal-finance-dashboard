'use client';

import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useTransactionProcessing } from '@/context/TransactionProcessingContext';
import { formatNumber } from '@/lib/utils';

export function TransactionProcessingStats() {
  const { transactions, totalCount, completedCount, localCompletedCount } = useTransactionProcessing();

  const progressValue = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  // Calculate AI stats
  const aiCompleted = Math.max(0, completedCount - localCompletedCount);
  const aiPending = transactions.filter(t => t.categoryStatus === 'pending').length;
  const totalAi = aiCompleted + aiPending;

  // Calculate top categories
  // O(n) where n = number of transactions
  const categoryCounts = transactions
    .filter(t => t.categoryStatus === 'completed')
    .reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  // O(n) where n = number of categories
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card className="bg-card shadow rounded-lg border border-border">
      <CardContent className="p-10">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="rounded-full bg-primary/10 p-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl font-bold text-foreground">Categorizing transactions</h3>
            <p className="text-muted-foreground">You can leave this page... we will notify you when it is ready.</p>
          </div>

          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-sm font-medium text-foreground">
              <span>Progress</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl pt-4">
            <div className="bg-muted/30 rounded-lg p-6 flex flex-col items-center justify-center border border-border/50">
              <span className="text-3xl font-bold text-foreground mb-1">{formatNumber(totalCount)}</span>
              <span className="text-sm text-muted-foreground font-medium">Total Uploaded</span>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 flex flex-col justify-center border border-border/50">
              <div className="space-y-4 w-full">
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm text-muted-foreground font-medium">Local Rules</span>
                  <span className="text-lg font-bold text-foreground">{formatNumber(localCompletedCount)}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm text-muted-foreground font-medium">AI Processing</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground block leading-none">
                      {formatNumber(aiCompleted)}
                    </span>
                    <span className="text-xs text-muted-foreground">of {formatNumber(totalAi)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 flex flex-col items-center border border-border/50">
              <span className="text-sm font-medium text-muted-foreground mb-2">Top Categories Forming</span>
              {topCategories.length > 0 ? (
                <div className="flex flex-col items-center space-y-1">
                  {topCategories.map(([cat, count]) => (
                    <span key={cat} className="text-sm font-semibold text-foreground">
                      {cat} <span className="text-muted-foreground font-normal">({count})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic mt-1">Analyzing...</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
