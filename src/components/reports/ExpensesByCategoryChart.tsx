'use client';

import { format } from 'date-fns';
import { Pie, PieChart, Cell, Legend } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartContainer, ChartTooltip } from '@/components/ui/Chart';
import { useMobile } from '@/lib/hooks/useMobile';
import { categoryIconMap } from '@/lib/utils';

import type { ExpensesByCategoryChartData } from './types';

interface LegendPayloadItem {
  value: string;
  id?: string;
  type?: string;
  color?: string;
}

interface ExpensesByCategoryChartProps {
  data: ExpensesByCategoryChartData[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function ExpensesByCategoryChart({ data, dateRange }: ExpensesByCategoryChartProps) {
  const isMobile = useMobile();

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  const chartConfig = data.reduce(
    (acc, item) => {
      acc[item.category] = {
        label: item.category,
        color: item.fill
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Category</CardTitle>
        <div className="text-sm text-muted-foreground">
          {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
        </div>
        <CardDescription>
          Total expenses: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center">
        <ChartContainer
          config={{ ...chartConfig, amount: { label: 'Amount' } }}
          className="aspect-auto h-[300px] w-full sm:h-[400px]"
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={isMobile ? 50 : '60%'}
              innerRadius={isMobile ? 20 : 30}
              label={({ category, percent }) => `${category} ${(percent * 100).toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{payload[0].name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Amount:</span>
                          <span className="text-sm font-bold">
                            $
                            {payload[0].value?.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              content={({ payload }) => {
                if (!payload) return null;

                return (
                  <div className="flex flex-wrap justify-center gap-4 pt-4">
                    {payload.map((entry, index) => {
                      // Cast to unknown first to avoid TS issues with implicit any if types are not perfect
                      const itemPayload = entry as unknown as LegendPayloadItem;
                      const item = data.find(d => d.category === itemPayload.value);
                      if (!item) return null;

                      const IconComponent = item.icon ? categoryIconMap[item.icon] : null;

                      return (
                        <div key={`legend-${index}`} className="flex items-center gap-2">
                          {IconComponent ? (
                            <IconComponent className="h-4 w-4" style={{ color: item.fill }} />
                          ) : (
                            <span
                              className="rounded-full w-3 h-3 inline-block"
                              style={{ backgroundColor: item.fill }}
                            ></span>
                          )}
                          <span className="text-sm font-medium" style={{ color: item.fill }}>
                            {item.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
