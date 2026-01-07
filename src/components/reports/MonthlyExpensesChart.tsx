'use client';

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { categoryIconMap, formatCurrency, formatLongDate, formatMonthYear } from '@/lib/utils';

import type { CategoryOptionType, MonthlyExpenseDataType } from '@/lib/actions/types';

interface MonthlyExpensesChartProps {
  data: MonthlyExpenseDataType[];
  categories: CategoryOptionType[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface LegendPayloadItem {
  value: string;
  id?: string;
  type?: string;
  color?: string;
}

export function MonthlyExpensesChart({ data, categories, dateRange }: MonthlyExpensesChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories present in the data for coloring and stacking
  const dataCategories = useMemo(() => {
    const cats = new Set<string>();
    // O(n) where n = data.length
    data.forEach(d => cats.add(d.category));
    return Array.from(cats);
  }, [data]);

  // Process data for the chart
  const chartData = useMemo(() => {
    const monthMap = new Map<string, Record<string, string | number>>();

    // O(n) where n = number of items in the data
    data.forEach(item => {
      const monthKey = item.month;
      if (!monthMap.has(monthKey)) {
        const [year, month] = monthKey.split('-').map(Number);
        monthMap.set(monthKey, {
          month: monthKey,
          label: formatMonthYear(new Date(year, month - 1))
        });
      }
      const entry = monthMap.get(monthKey);
      if (entry) {
        entry[item.category] = item.amount;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
  }, [data]);

  const activeData = useMemo(() => {
    if (selectedCategory === 'all') {
      return chartData;
    }

    // O(m) where m = number of months
    return chartData.map(item => ({
      ...item,
      value: item[selectedCategory] || 0
    }));
  }, [chartData, selectedCategory]);

  const getCategoryColor = (catName: string) => {
    // O(c) where c = number of categories
    const cat = categories.find(c => c.name === catName);
    return cat?.color || '#cccccc';
  };

  const getCategoryIcon = (catName: string) => {
    // O(c) where c = number of categories
    const cat = categories.find(c => c.name === catName);
    return cat?.icon;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Monthly Expenses</CardTitle>

            <div className="text-sm text-muted-foreground mt-1">
              {formatLongDate(dateRange.from)} - {formatLongDate(dateRange.to)}
            </div>

            <CardDescription className="mt-1">
              {selectedCategory === 'all'
                ? 'Spending breakdown by category over time'
                : `Monthly spending for ${selectedCategory}`}
            </CardDescription>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-45" aria-label="Select Category">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>

              {/* O(c) where c = number of categories */}
              {categories.map(cat => {
                const IconComponent = cat.icon ? categoryIconMap[cat.icon] : null;
                return (
                  <SelectItem key={cat.id} value={cat.name}>
                    <div className="flex items-center gap-2">
                      {IconComponent ? (
                        <IconComponent className="h-4 w-4" style={{ color: cat.color }} />
                      ) : (
                        <span
                          className="rounded-full w-3 h-3 inline-block"
                          style={{ backgroundColor: cat.color }}
                        ></span>
                      )}
                      {cat.name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-75 sm:h-100 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeData}
              margin={{
                top: 20,
                right: 30,
                left: 0,
                bottom: 5
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />

              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={value => formatCurrency(value)}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    // O(n) where n = number of categories
                    const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="mb-2 border-b pb-1 font-medium">{label}</div>
                        <div className="grid gap-1">
                          {/* O(c^2) (c iterations * O(c) lookup) */}
                          {[...payload].reverse().map((entry, index) => {
                            const catName = entry.name as string;
                            const value = entry.value as number;
                            const color = entry.color;
                            const iconName = getCategoryIcon(catName);
                            const IconComponent = iconName ? categoryIconMap[iconName] : null;

                            // Filter out zero values to keep tooltip clean
                            if (value === 0) {
                              return null;
                            }

                            return (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                {IconComponent ? (
                                  <IconComponent className="h-3 w-3" style={{ color }} />
                                ) : (
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                )}
                                <span className="text-muted-foreground">{catName}:</span>
                                <span className="font-medium ml-auto">{formatCurrency(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 border-t pt-1 flex items-center justify-between font-bold text-sm">
                          <span>Total</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                content={({ payload }) => {
                  if (!payload) {
                    return null;
                  }

                  return (
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                      {/* O(c^2) (c iterations * O(c) lookup) */}
                      {payload.map((entry, index) => {
                        const itemPayload = entry as unknown as LegendPayloadItem;
                        const catName = itemPayload.value;
                        const iconName = getCategoryIcon(catName);
                        const IconComponent = iconName ? categoryIconMap[iconName] : null;
                        const color = getCategoryColor(catName);

                        return (
                          <div key={`legend-${index}`} className="flex items-center gap-2">
                            {IconComponent ? (
                              <IconComponent className="h-4 w-4" style={{ color }} />
                            ) : (
                              <span
                                className="rounded-full w-3 h-3 inline-block"
                                style={{ backgroundColor: color }}
                              ></span>
                            )}
                            <span className="text-sm font-medium text-foreground">
                              {catName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />

              {selectedCategory === 'all' ? (
                // Stacked bars for all categories
                // O(c^2) (c iterations * O(c) lookup)
                dataCategories.map(catName => (
                  <Bar
                    key={catName}
                    dataKey={catName}
                    stackId="a"
                    fill={getCategoryColor(catName)}
                    name={catName}
                    radius={[0, 0, 0, 0]}
                  />
                ))
              ) : (
                // Single bar for selected category
                <Bar
                  dataKey="value"
                  fill={getCategoryColor(selectedCategory)}
                  name={selectedCategory}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
