'use client';

import { format, subYears } from 'date-fns';
import { Plus, Minus, CalendarIcon, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/Field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useMobile } from '@/lib/hooks';
import { cn } from '@/lib/utils';

import type { AccountOption } from '@/lib/actions/types';

interface ReportFiltersProps {
  accounts: AccountOption[];
}

export function ReportFilters({ accounts }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const isMobile = useMobile();

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      return {
        from: new Date(fromParam),
        to: new Date(toParam)
      };
    }
    const end = new Date();
    const start = subYears(end, 1);
    return {
      from: start,
      to: end
    };
  });

  // Helper to update URL params
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([name, value]) => {
        if (value && value !== 'all') {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  const handleAccountChange = (value: string) => {
    const queryString = createQueryString({ account: value === 'all' ? null : value });
    router.push(`${pathname}?${queryString}`);
  };

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
  };

  const handleDateClose = (open: boolean) => {
    if (!open && date?.from && date?.to) {
      const queryString = createQueryString({
        from: date.from.toISOString(),
        to: date.to.toISOString()
      });
      router.push(`${pathname}?${queryString}`);
    }
  };

  const currentAccount = searchParams.get('account') || 'all';

  return (
    <Card className="gap-2 mb-4 transition-[padding] duration-300">
      <Collapsible open={!isMobile ? true : isFiltersCollapsed} onOpenChange={setIsFiltersCollapsed}>
        <CollapsibleTrigger className="group w-full flex items-center justify-between" tabIndex={-1}>
          <CardHeader className="w-full">
            <CardTitle className="w-full text-left">Filter Reports</CardTitle>
          </CardHeader>

          <Plus className="h-4 w-4 mr-4 hidden group-data-[state=closed]:block md:group-data-[state=open]:hidden" />

          <Minus className="h-4 w-4 mr-4 hidden group-data-[state=open]:block md:group-data-[state=open]:hidden" />
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <CardContent>
            <div className="flex items-center py-4 gap-4 flex-wrap md:flex-nowrap">
              <div className="w-full md:max-w-md">
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="account-filter">By Account:</FieldLabel>

                      <Select value={currentAccount} onValueChange={handleAccountChange}>
                        <SelectTrigger className="h-8 w-50">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="all">All Accounts</SelectItem>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.name}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </div>

              <div className="w-full md:max-w-md">
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Date Range:</FieldLabel>

                      <Popover onOpenChange={handleDateClose}>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal h-8',
                              !date && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                              date.to ? (
                                <>
                                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(date.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <ChevronDown className="ml-auto size-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
