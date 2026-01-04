'use client';

import { format } from 'date-fns';
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, Loader2, History } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

import { EmptyState } from '../common/EmptyState';

type InsightData = {
  id: string;
  generatedAt: string;
  summary: string;
  recommendations: Array<{
    category: string;
    tip: string;
    potentialSavings: number;
  }>;
  budgetAlerts: string[];
};

export function AIInsights() {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [history, setHistory] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [noData, setNoData] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/insights', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  }, []);

  const generateInsights = useCallback(
    async (force: boolean = false) => {
      setLoading(true);
      setNoData(false);
      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force })
        });

        if (res.status === 404) {
          setNoData(true);
          setInsights(null);
          setHasLoaded(true);
          return;
        }

        const data = await res.json();
        setInsights(data);
        setHasLoaded(true);
        // Refresh history to include the potentially new insight
        fetchHistory();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [fetchHistory]
  );

  useEffect(() => {
    // Load insights on mount
    generateInsights(false);
    fetchHistory();
  }, [generateInsights, fetchHistory]);

  const handleHistorySelect = (insightId: string) => {
    const selected = history.find(h => h.id === insightId);
    if (selected) {
      setInsights(selected);
    }
  };

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Select onValueChange={handleHistorySelect} value={insights?.id}>
              <SelectTrigger className="w-[200px]">
                <History className="mr-2 h-4 w-4" />
                <SelectValue placeholder="History" />
              </SelectTrigger>
              <SelectContent>
                {history.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {format(new Date(item.generatedAt), 'MMM d, yyyy h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={() => generateInsights(true)} disabled={loading} variant={hasLoaded ? 'outline' : 'default'}>
            {loading ? (
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

      {noData && !insights && <EmptyState />}

      {insights && (
        <div className="space-y-4">
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            Generated on {format(new Date(insights.generatedAt), 'MMMM d, yyyy at h:mm a')}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Summary Card */}
            <Card className="col-span-2 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900">
              <CardHeader>
                <CardTitle className="text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{insights.summary}</p>
              </CardContent>
            </Card>

            {/* Budget Alerts */}
            {insights.budgetAlerts && insights.budgetAlerts.length > 0 && (
              <Card className="col-span-2 md:col-span-1 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/10">
                <CardHeader>
                  <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Attention Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.budgetAlerts.map((alert, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-800 dark:text-orange-300">
                        <span>•</span>
                        {alert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Savings Opportunities */}
            <Card
              className={
                insights.budgetAlerts && insights.budgetAlerts.length > 0 ? 'col-span-2 md:col-span-1' : 'col-span-2'
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-500" />
                  Savings Opportunities
                </CardTitle>
                <CardDescription>Actionable tips to reduce your monthly spend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.recommendations &&
                  insights.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex flex-col space-y-1 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">
                          {rec.category}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                          Save ~${rec.potentialSavings}/mo
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.tip}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
