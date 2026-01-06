'use client';

import { Pie, PieChart, Cell } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartContainer, ChartTooltip } from '@/components/ui/Chart';
import { useMobile } from '@/lib/hooks/useMobile';
import { categoryIconMap, formatCurrency, formatLongDate, formatPercentage } from '@/lib/utils';

import type { ExpensesByCategoryChartDataType } from './types';

interface ExpensesByCategoryChartProps {
  data: ExpensesByCategoryChartDataType[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function ExpensesByCategoryChart({ data, dateRange }: ExpensesByCategoryChartProps) {
  const isMobile = useMobile();

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // O(c) where c = number of categories
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
          {formatLongDate(dateRange.from)} - {formatLongDate(dateRange.to)}
        </div>

        <CardDescription>Total expenses: {formatCurrency(total)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col justify-center items-center">
        <ChartContainer
          config={{ ...chartConfig, amount: { label: 'Amount' } }}
          className="mx-auto aspect-square min-h-100 max-h-125 w-full pb-0"
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={isMobile ? '80%' : '60%'}
              innerRadius={isMobile ? '50%' : '30%'}
              label={isMobile ? undefined : ({ category, percent }) => `${category} ${formatPercentage(percent)}`}
              labelLine={!isMobile}
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
                          <span className="text-sm font-bold">{formatCurrency(payload[0].value as number)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ChartContainer>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {data.map((item, index) => {
            const IconComponent = item.icon ? categoryIconMap[item.icon] : null;

            return (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                {IconComponent ? (
                  <IconComponent className="h-4 w-4" style={{ color: item.fill }} />
                ) : (
                  <span className="rounded-full w-3 h-3 inline-block" style={{ backgroundColor: item.fill }}></span>
                )}
                <span className="text-sm font-medium" style={{ color: item.fill }}>
                  {item.category} ({formatPercentage(item.amount / total)})
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
