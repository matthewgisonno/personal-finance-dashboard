'use client';

import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, Row, useReactTable } from '@tanstack/react-table';
import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  Virtualizer,
  type VirtualizerOptions
} from '@tanstack/virtual-core';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useLayoutEffect } from 'react';

import { cn, formatCurrency, formatDate } from '@/lib/utils';

import type { CategorizedTransaction } from '@/lib/services/types';

interface TransactionImporterDisplayProps {
  data: CategorizedTransaction[];
}

// @tanstack/react-virtual's hook uses react-dom.flushSync for "sync" updates.
// With React 19 + rapid list changes during scroll, that can trigger:
// "flushSync was called from inside a lifecycle method"
// This hook uses virtual-core directly and schedules rerenders without flushSync.
type VirtualizerOptionsNoDefaults<TScrollElement extends Element, TItemElement extends Element> = Omit<
  VirtualizerOptions<TScrollElement, TItemElement>,
  'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
> & {
  observeElementRect?: VirtualizerOptions<TScrollElement, TItemElement>['observeElementRect'];
  observeElementOffset?: VirtualizerOptions<TScrollElement, TItemElement>['observeElementOffset'];
  scrollToFn?: VirtualizerOptions<TScrollElement, TItemElement>['scrollToFn'];
};

function useVirtualizerNoFlushSync<TScrollElement extends Element, TItemElement extends Element>(
  options: VirtualizerOptionsNoDefaults<TScrollElement, TItemElement>
) {
  const rerender = useReducer(() => ({}), {})[1];
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resolvedOptions = useMemo<VirtualizerOptions<TScrollElement, TItemElement>>(
    () => ({
      ...options,
      observeElementRect: options.observeElementRect ?? observeElementRect,
      observeElementOffset: options.observeElementOffset ?? observeElementOffset,
      scrollToFn: options.scrollToFn ?? elementScroll,
      onChange: (instance, sync) => {
        // Always schedule; never flushSync
        queueMicrotask(() => {
          if (mountedRef.current) {
            rerender();
          }
        });
        options.onChange?.(instance, sync);
      }
    }),
    [options, rerender]
  );

  const [instance] = useState(() => new Virtualizer(resolvedOptions));
  instance.setOptions(resolvedOptions);

  // Similar lifecycle to @tanstack/react-virtual, but without flushSync onChange.
  const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;
  useIsoLayoutEffect(() => instance._didMount(), [instance]);
  useIsoLayoutEffect(() => instance._willUpdate());

  return instance;
}

export function TransactionImporterDisplay({ data }: TransactionImporterDisplayProps) {
  // While background processing is removing rows, avoid applying count changes mid-scroll
  // (react-virtual uses internal flushSync paths to keep scroll stable; rapid count changes while
  // scrolling can trigger React warnings).
  const [renderData, setRenderData] = useState<CategorizedTransaction[]>(data);
  const isScrollingRef = useRef(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedDataRef = useRef<CategorizedTransaction[] | null>(null);

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isScrollingRef.current) {
      queuedDataRef.current = data;
      return;
    }
    setRenderData(data);
  }, [data]);

  const columns = useMemo<ColumnDef<CategorizedTransaction>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        size: 150,
        cell: info => {
          const val = info.getValue<string | Date>();
          const date = val instanceof Date ? val : new Date(val);
          return <span className="text-gray-500 text-sm">{formatDate(date)}</span>;
        }
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 400,
        cell: info => <span className="font-medium text-gray-900 text-sm">{info.getValue<string>()}</span>
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 200,
        cell: () => (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
            Pending...
          </span>
        )
      },
      {
        accessorKey: 'categorySource',
        header: 'Source',
        size: 100,
        cell: () => (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
            Pending...
          </span>
        )
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        size: 150,
        cell: info => {
          const val = info.getValue<number | string>();
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return <span className="text-gray-900 text-right font-mono text-sm">{formatCurrency(num as number)}</span>;
        },
        meta: { align: 'right' }
      }
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: renderData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Ensure row IDs are stable so virtualization keys don't churn when rows are removed
    getRowId: row => row.id
  });

  const { rows } = table.getRowModel();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const estimateSize = useCallback(() => 57, []);
  const getScrollElement = useCallback(() => tableContainerRef.current, []);
  const getItemKey = useCallback((index: number) => rows[index]?.id, [rows]);

  const rowVirtualizer = useVirtualizerNoFlushSync<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize,
    getScrollElement,
    overscan: 10,
    getItemKey
  });

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      <div
        className="h-[600px] overflow-auto relative"
        ref={tableContainerRef}
        onScroll={() => {
          isScrollingRef.current = true;
          if (scrollEndTimerRef.current) {
            clearTimeout(scrollEndTimerRef.current);
          }
          scrollEndTimerRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            if (queuedDataRef.current) {
              const next = queuedDataRef.current;
              queuedDataRef.current = null;
              // Defer to a microtask to ensure we're outside any ongoing React commit work.
              queueMicrotask(() => setRenderData(next));
            }
          }, 150);
        }}
      >
        <table className="grid w-full">
          <thead className="grid sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center',
                      header.column.columnDef.meta?.align === 'right' && 'justify-end'
                    )}
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="grid relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index] as Row<CategorizedTransaction>;
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors flex w-full absolute items-center"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap flex items-center',
                        cell.column.columnDef.meta?.align === 'right' && 'justify-end'
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
