'use client';

import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { formatNumber } from '@/lib/utils';

import type { CategorizedTransactionType } from '@/lib/services/types';

interface TransactionProcessingStatsProps {
  transactions: CategorizedTransactionType[];
}

export function TransactionProcessingStats({ transactions }: TransactionProcessingStatsProps) {
  const totalCount = transactions.length;
  const pendingCount = transactions.filter(t => t.categoryStatus === 'pending').length;
  const completedCount = totalCount - pendingCount;
  const progressValue = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

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
            <div className="bg-muted/30 rounded-lg p-6 flex flex-col items-center border border-border/50">
              <span className="text-3xl font-bold text-foreground mb-1">{formatNumber(totalCount)}</span>
              <span className="text-sm text-muted-foreground font-medium">Total Transactions</span>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 flex flex-col items-center border border-border/50">
              <span className="text-3xl font-bold text-foreground mb-1">{Math.round(progressValue)}%</span>
              <span className="text-sm text-muted-foreground font-medium">Categorized</span>
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
