'use client';

import { subYears } from 'date-fns';
import { CalendarIcon, ChevronDown, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { DateRange } from 'react-day-picker';

import { MobileCollapsibleCard } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/Field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { cn, formatLongDate } from '@/lib/utils';

import type { AccountOptionType } from '@/lib/actions/types';

interface ReportFiltersProps {
  accounts: AccountOptionType[];
  defaultDateRange?: { from: Date; to: Date };
}

export function ReportFilters({ accounts, defaultDateRange }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      return {
        from: new Date(fromParam),
        to: new Date(toParam)
      };
    }

    if (defaultDateRange) {
      return defaultDateRange;
    }

    const end = new Date();
    const start = subYears(end, 1);
    return {
      from: start,
      to: end
    };
  });

  // Helper to update URL params
  // O(p) where p = number of search params
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

  const isFiltered = currentAccount !== 'all' || searchParams.has('from') || searchParams.has('to');

  const handleClearFilters = () => {
    if (defaultDateRange) {
      setDate(defaultDateRange);
    } else {
      const end = new Date();
      const start = subYears(end, 1);
      setDate({
        from: start,
        to: end
      });
    }
    router.push(pathname);
  };

  return (
    <MobileCollapsibleCard title="Filter Reports">
      <div className="flex items-center py-4 gap-4 flex-wrap md:flex-nowrap">
        <div className="w-full md:max-w-md">
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-filter">By Account:</FieldLabel>

                <Select value={currentAccount} onValueChange={handleAccountChange}>
                  <SelectTrigger className="h-8 w-50" aria-label="Filter by Account">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {/* O(a) where a = number of accounts */}
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
                        'w-full justify-start text-left font-normal h-8 bg-card',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {formatLongDate(date.from)} - {formatLongDate(date.to)}
                          </>
                        ) : (
                          formatLongDate(date.from)
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

      {isFiltered && (
        <Button variant="outline" onClick={handleClearFilters} className="h-8 cursor-pointer w-full md:w-auto">
          Clear Filters
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </MobileCollapsibleCard>
  );
}
