'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Row,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  RowSelectionState
} from '@tanstack/react-table';
import { useVirtualizer, VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { CircleArrowDown, CircleArrowUp, Database, Minus, MoreHorizontal, Plus, Sparkles, User, X } from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';

import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { bulkUpdateTransactionCategory } from '@/lib/actions/bulkUpdateTransactionCategory';
import { updateTransactionCategory } from '@/lib/actions/updateTransactionCategory';
import { useMobile } from '@/lib/hooks';
import { cn, categoryIconMap, formatCurrency, formatDate, formatNumber } from '@/lib/utils';

import { EmptyState } from '../common/EmptyState';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/Collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/DropdownMenu';
import { Field, FieldGroup, FieldLabel, FieldSet } from '../ui/Field';

import type { CategoryOption, AccountOption } from '@/lib/actions/types';
import type { CategorizedTransaction } from '@/lib/services/types';

interface TransactionDisplayProps {
  inputData: CategorizedTransaction[];
  categories?: CategoryOption[];
  accounts?: AccountOption[];
}

export function TransactionDisplay({ inputData, categories = [], accounts = [] }: TransactionDisplayProps) {
  const [data, setData] = useState<CategorizedTransaction[]>(inputData || []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (inputData) {
      setData(inputData);
    }
  }, [inputData]);

  const columns = useMemo<ColumnDef<CategorizedTransaction>[]>(
    () => [
      {
        id: 'select',
        size: 50,
        header: ({ table }) => {
          const rows = table.getFilteredRowModel().rows;
          const checked = rows.length > 0 && rows.every(row => row.getIsSelected());
          const indeterminate = rows.some(row => row.getIsSelected()) && !checked;

          return (
            <div className="flex items-center justify-center w-full">
              <Checkbox
                checked={checked || (indeterminate ? 'indeterminate' : false)}
                onCheckedChange={value => {
                  const isChecked = !!value;
                  const newSelection: RowSelectionState = {};
                  if (isChecked) {
                    rows.forEach(row => {
                      newSelection[row.id] = true;
                    });
                  }
                  table.setRowSelection(newSelection);
                }}
                aria-label="Select all"
              />
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-full">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={value => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        meta: {
          align: 'center'
        }
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: info => {
          const val = info.getValue<string | Date>();
          const date = val instanceof Date ? val : new Date(val);
          return <div className="flex items-center w-full">{formatDate(date)}</div>;
        }
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 250,
        cell: info => <div className="flex items-center w-full">{info.getValue<string>()}</div>
      },
      {
        accessorKey: 'accountName',
        header: 'Account',
        size: 150,
        cell: info => <div className="flex items-center w-full">{info.getValue<string>() || 'Unknown'}</div>
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 200,
        cell: ({ row }) => {
          const transaction = row.original;

          return (
            <Select
              value={transaction.categoryId || ''}
              onValueChange={async value => {
                // Optimistic update
                // O(n) where n = total transactions in state
                setData(prev =>
                  prev.map(t =>
                    t.id === transaction.id
                      ? {
                          ...t,
                          categoryId: value,
                          category: categories.find(c => c.id === value)?.name || t.category,
                          categorySource: 'manual',
                          categoryStatus: 'completed'
                        }
                      : t
                  )
                );
                await updateTransactionCategory(transaction.id, value);
              }}
            >
              <SelectTrigger className="h-8 w-50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>

              <SelectContent>
                {/* O(c) where c = number of categories */}
                {categories.map(cat => {
                  const IconComponent = cat.icon ? categoryIconMap[cat.icon] : null;
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
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
          );
        }
      },
      {
        accessorKey: 'categorySource',
        header: 'Source',
        cell: ({ row }) => {
          const source = row.original.categorySource;
          const confidence = parseFloat(row.original.categoryConfidence || '0');
          const isAI = source === 'ai';
          const isLocal = source === 'local';
          const isManual = source === 'manual';

          if (isAI) {
            return (
              <div className="flex items-center">
                <Badge variant="secondary" className="gap-1 text-[10px] h-6 px-2 w-fit">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  {Math.round(confidence * 100)}%
                </Badge>
              </div>
            );
          }

          if (isLocal) {
            return (
              <div className="flex items-center">
                <Badge variant="secondary" className="gap-1 text-[10px] h-6 px-2 w-fit">
                  <Database className="h-3 w-3" />

                  <span>Local</span>
                </Badge>
              </div>
            );
          }

          if (isManual) {
            return (
              <div className="flex items-center">
                <Badge variant="secondary" className="gap-1 text-[10px] h-6 px-2 w-fit">
                  <User className="h-3 w-3" />

                  <span>Manual</span>
                </Badge>
              </div>
            );
          }

          return <span className="text-xs text-muted-foreground px-2">{source?.toUpperCase()}</span>;
        },
        size: 100,
        meta: {
          align: 'center'
        }
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: info => {
          const val = info.getValue<number | string>();
          const num = typeof val === 'string' ? parseFloat(val) : val;
          const formatted = !isNaN(num) ? formatCurrency(num) : val;
          return <div className="flex items-center">{formatted}</div>;
        },
        size: 100,
        meta: {
          align: 'center'
        }
      },
      {
        id: 'actions',
        cell: () => {
          return (
            <div className="flex items-center w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>

                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem>Edit Category Name</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
      }
    ],
    [categories]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: row => row.id,
    debugTable: true,
    state: {
      columnFilters,
      rowSelection
    }
  });

  const { rows } = table.getRowModel();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 33,
    getScrollElement: () => tableContainerRef.current,
    overscan: 5
  });

  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);
  const isMobile = useMobile();

  const handleBulkUpdate = async () => {
    if (!bulkCategory) return;

    setIsBulkUpdating(true);
    const selectedIds = Object.keys(rowSelection);
    const categoryName = categories.find(c => c.id === bulkCategory)?.name;

    // Optimistic update
    // O(n) where n = total transactions (iterating to apply updates)
    setData(prev =>
      prev.map(t =>
        rowSelection[t.id]
          ? {
              ...t,
              categoryId: bulkCategory,
              category: categoryName || t.category,
              categorySource: 'manual',
              categoryStatus: 'completed'
            }
          : t
      )
    );

    const result = await bulkUpdateTransactionCategory(selectedIds, bulkCategory);

    setIsBulkUpdating(false);

    if (result.success) {
      setRowSelection({});
      setBulkCategory('');
    } else {
      console.error('Bulk update failed');
    }
  };

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <Card className="gap-2 transition-[padding] duration-300">
        <Collapsible open={!isMobile ? true : isFiltersCollapsed} onOpenChange={setIsFiltersCollapsed}>
          <CollapsibleTrigger className="group w-full flex items-center justify-between" tabIndex={-1}>
            <CardHeader className="w-full">
              <CardTitle className="w-full text-left">Filter Transactions</CardTitle>
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
                        <FieldLabel htmlFor="feedback">By Description:</FieldLabel>

                        <Input
                          placeholder="Filter transactions..."
                          value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
                          onChange={event => table.getColumn('description')?.setFilterValue(event.target.value)}
                        />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </div>

                <div className="w-full md:max-w-md">
                  <FieldSet>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="category-filter">By Category:</FieldLabel>

                        <Select
                          value={(table.getColumn('category')?.getFilterValue() as string) ?? 'all'}
                          onValueChange={value =>
                            table.getColumn('category')?.setFilterValue(value === 'all' ? undefined : value)
                          }
                        >
                          <SelectTrigger className="h-8 w-50">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>

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
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </div>

                <div className="w-full md:max-w-md">
                  <FieldSet>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="account-filter">By Account:</FieldLabel>

                        <Select
                          value={(table.getColumn('accountName')?.getFilterValue() as string) ?? 'all'}
                          onValueChange={value =>
                            table.getColumn('accountName')?.setFilterValue(value === 'all' ? undefined : value)
                          }
                        >
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
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {Object.keys(rowSelection).length > 0 && (
        <Card className="gap-0">
          <CardHeader className="">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>
                {`${formatNumber(Object.keys(rowSelection).length)} Transaction${Object.keys(rowSelection).length === 1 ? '' : 's'} Selected`}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                className="h-auto p-0 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4 mr-1" />
                Clear Selection
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="py-3 flex flex-wrap items-end gap-4">
            <div className="grid w-full max-w-sm items-center gap-2">
              <label
                htmlFor="bulk-category"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Bulk Change Category
              </label>

              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger id="bulk-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>

                <SelectContent>
                  {/* O(c) where c = number of categories */}
                  {categories.map(cat => {
                    const IconComponent = cat.icon ? categoryIconMap[cat.icon] : null;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
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

            <Button onClick={handleBulkUpdate} disabled={!bulkCategory || isBulkUpdating} className="cursor-pointer">
              {isBulkUpdating ? 'Updating...' : 'Update Transactions'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        Showing <strong>{formatNumber(table.getFilteredRowModel().rows.length)}</strong> of{' '}
        <strong>{formatNumber(data.length)}</strong> transactions
      </div>

      <div className="h-150 overflow-auto relative rounded-md border border-border" ref={tableContainerRef}>
        <table className="grid w-full">
          <thead className="grid sticky top-0 z-10 bg-card border-b border-border">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map(header => {
                  return (
                    <th
                      key={header.id}
                      className={cn('flex px-2 py-2 font-semibold justify-start text-left', {
                        'justify-center text-center': header.column.columnDef.meta?.align === 'center'
                      })}
                      style={{
                        width: header.getSize()
                      }}
                    >
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2'
                            : 'flex items-center ',
                          onClick: header.column.getToggleSortingHandler()
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <CircleArrowUp className="h-4 w-4" />,
                          desc: <CircleArrowDown className="h-4 w-4" />
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="grid relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {/* O(v) where v = visible items + overscan (constant relative to n) */}
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index] as Row<CategorizedTransaction>;
              return <TableBodyRow key={row.id} row={row} virtualRow={virtualRow} rowVirtualizer={rowVirtualizer} />;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface TableBodyRowProps {
  row: Row<CategorizedTransaction>;
  virtualRow: VirtualItem;
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
}

function TableBodyRow({ row, virtualRow, rowVirtualizer }: TableBodyRowProps) {
  return (
    <tr
      data-index={virtualRow.index}
      ref={node => rowVirtualizer.measureElement(node)}
      key={row.id}
      className="border-b border-border bg-white hover:bg-muted/50 flex w-full absolute"
      style={{ transform: `translateY(${virtualRow.start}px)` }}
    >
      {row.getVisibleCells().map(cell => {
        return (
          <td
            key={cell.id}
            className={cn('p-2 flex flex-start', {
              'justify-center': cell.column.columnDef.meta?.align === 'center'
            })}
            style={{ width: cell.column.getSize() }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}
