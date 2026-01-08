'use client';

import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, Loader2, History } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';

import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { generateInsightsAction, getInsightHistory } from '@/lib/actions';
import { formatDateTime, formatFullDateTime } from '@/lib/utils';

import type { InsightDataType } from '@/lib/actions/types';

interface AIInsightsClientProps {
  initialInsight: InsightDataType | null;
  initialHistory: InsightDataType[];
}

export function AIInsightsClient({ initialInsight, initialHistory }: AIInsightsClientProps) {
  const [insights, setInsights] = useState<InsightDataType | null>(initialInsight);
  const [history, setHistory] = useState<InsightDataType[]>(initialHistory);
  const [isPending, startTransition] = useTransition();

  const handleGenerateInsights = (force: boolean) => {
    startTransition(async () => {
      try {
        const newInsight = await generateInsightsAction(force);
        if (newInsight) {
          setInsights(newInsight);
          // Update history
          const updatedHistory = await getInsightHistory();
          setHistory(updatedHistory);
        }
      } catch (error) {
        console.error('Failed to generate insights:', error);
      }
    });
  };

  useEffect(() => {
    // O(1) check
    const shouldRefresh = () => {
      if (!initialInsight) {
        return true;
      }
      const generatedAt = new Date(initialInsight.generatedAt);
      const now = new Date();
      const msSinceGeneration = now.getTime() - generatedAt.getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      return msSinceGeneration >= sevenDaysInMs;
    };

    requestAnimationFrame(() => {
      if (shouldRefresh()) {
        handleGenerateInsights(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHistorySelect = (insightId: string) => {
    const selected = history.find(h => h.id === insightId);
    if (selected) {
      setInsights(selected);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI Financial Insights
          </h2>

          <p className="text-muted-foreground">
            Get personalized, privacy-safe recommendations based on your spending patterns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {history.length > 0 && (
            <Select onValueChange={handleHistorySelect} value={insights?.id}>
              <SelectTrigger className="w-full md:w-57 bg-card" aria-label="Select Insight History">
                <History className="mr-2 h-4 w-4" />

                <SelectValue placeholder="History" />
              </SelectTrigger>
              <SelectContent className="w-full md:w-57" position="popper">
                {/* O(h) where h = history length (limited to 10) */}
                {history.map(item => (
                  <SelectItem key={item.id} value={item.id} className="w-full md:w-57">
                    {formatDateTime(item.generatedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={() => handleGenerateInsights(true)} disabled={isPending} className="w-full md:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Refresh Analysis'
            )}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {!insights && <EmptyState />}

      {/* Insights */}
      {insights && (
        <>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            Generated on {formatFullDateTime(insights.generatedAt)}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-2 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-slate-900">{insights.summary}</p>
              </CardContent>
            </Card>

            {insights.budgetAlerts && insights.budgetAlerts.length > 0 && (
              <Card className="col-span-2 md:col-span-1 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Attention Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.budgetAlerts.map((alert: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-900">
                        <span className="text-orange-800">•</span>
                        {alert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card
              className={
                insights.budgetAlerts && insights.budgetAlerts.length > 0 ? 'col-span-2 md:col-span-1' : 'col-span-2'
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingDown className="h-5 w-5 text-green-700" />
                  Savings Opportunities
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Actionable tips to reduce your monthly spend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* O(r) where r = recommendations count */}
                {insights.recommendations &&
                  insights.recommendations.map((rec: InsightDataType['recommendations'][number], i: number) => (
                    <div key={i} className="flex flex-col space-y-1 p-3 rounded-lg border bg-card shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">
                          {rec.category}
                        </span>
                        <span className="text-green-700 font-bold text-sm">Save ~${rec.potentialSavings}/mo</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{rec.tip}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
