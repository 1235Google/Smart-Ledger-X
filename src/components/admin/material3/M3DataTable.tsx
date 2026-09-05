import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Filter, 
  X, 
  Download, 
  RefreshCw,
  Layers
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useM3Theme } from './M3ThemeContext';
import { M3Card } from './M3Card';
import { M3Button } from './M3Button';
import { M3Chip } from './M3Chip';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface M3DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index?: number) => string | number;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  filters?: {
    id: string;
    label: string;
    options: { label: string; value: string; count?: number }[];
    currentValue: string;
    onChange: (value: string) => void;
  }[];
  actions?: React.ReactNode;
  emptyMessage?: string;
  emptySubtitle?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  isLoading?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string | number>;
  onSelectToggle?: (id: string | number) => void;
  onSelectAll?: () => void;
}

export function M3DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  title,
  subtitle,
  searchPlaceholder = 'Search records...',
  searchFields = [],
  filters = [],
  actions,
  emptyMessage = 'No matching records found',
  emptySubtitle = 'Try refining your search keyword or active filters',
  emptyAction,
  isLoading = false,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  onRowClick,
  selectedIds,
  onSelectToggle,
  onSelectAll,
}: M3DataTableProps<T>) {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field as string];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      }
      // Otherwise search all string/number fields on item
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(q);
        }
        return false;
      });
    });
  }, [data, searchQuery, searchFields]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Handle dates
      if (typeof valA === 'string' && (valA.includes('T') || valA.includes('-')) && !isNaN(Date.parse(valA))) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Handle numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // Handle strings
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const hasSelection = Boolean(selectedIds && onSelectToggle);
  const allSelected = hasSelection && paginatedData.length > 0 && paginatedData.every((item) => selectedIds!.has(keyExtractor(item)));

  return (
    <M3Card variant="elevated" padding="none" className="flex flex-col">
      {/* Table Header: Title, Search, Filters, & Actions */}
      <div className="p-4 sm:p-6 border-b border-[#e1e3e1]/60 dark:border-[#2d2f31] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className={cn('text-xl font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                {subtitle}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
        </div>

        {/* Search Bar and Filter Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm outline-none transition-all border',
                isDark
                  ? 'bg-[#1e1f20] text-white border-[#3c4043] focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20'
                  : 'bg-[#f0f4f9] text-[#1f1f1f] border-[#c4c7c5]/60 focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters */}
          {filters.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {filters.map((filterGroup) => (
                <div key={filterGroup.id} className="flex items-center gap-1.5 shrink-0">
                  {filterGroup.options.map((opt) => (
                    <M3Chip
                      key={opt.value}
                      label={opt.label}
                      count={opt.count}
                      selected={filterGroup.currentValue === opt.value}
                      onClick={() => {
                        filterGroup.onChange(opt.value);
                        setCurrentPage(1);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="w-full overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          {/* Sticky Header */}
          <thead className={cn(
            'sticky top-0 z-10 select-none border-b',
            isDark ? 'bg-[#212224] text-[#c4c7c5] border-[#2d2f31]' : 'bg-[#f8fafd] text-[#444746] border-[#e1e3e1]'
          )}>
            <tr>
              {hasSelection && (
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded text-[#0b57d0] accent-[#0b57d0] dark:accent-[#a8c7fa] cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      'px-4 py-3.5 font-semibold tracking-wide text-xs uppercase',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.sortable && 'cursor-pointer hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] transition-colors',
                      col.className
                    )}
                  >
                    <div className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end w-full',
                      col.align === 'center' && 'justify-center w-full'
                    )}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} className="text-[#0b57d0] dark:text-[#a8c7fa]" /> : <ArrowDown size={14} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={cn('divide-y', isDark ? 'divide-[#2d2f31]' : 'divide-[#edf2f7]')}>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {hasSelection && <td className="px-4 py-4"><div className="w-4 h-4 bg-slate-700/30 rounded" /></td>}
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-4">
                      <div className="h-4 bg-slate-700/20 dark:bg-slate-700/40 rounded-full w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item, index) => {
                const id = keyExtractor(item, startIndex + index);
                const rowKey = id !== undefined && id !== null && id !== '' ? `row-${id}-${startIndex + index}` : `row-${startIndex + index}`;
                const isSelected = selectedIds?.has(id);
                return (
                  <motion.tr
                    key={rowKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: index * 0.015 }}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'transition-colors duration-150',
                      onRowClick && 'cursor-pointer',
                      isDark
                        ? isSelected
                          ? 'bg-[#004a77]/30 hover:bg-[#004a77]/45'
                          : 'hover:bg-[#282a2d]/80'
                        : isSelected
                        ? 'bg-[#c2e7ff]/40 hover:bg-[#c2e7ff]/60'
                        : 'hover:bg-[#f0f4f9]'
                    )}
                  >
                    {hasSelection && (
                      <td className="w-12 px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectToggle!(id)}
                          className="w-4 h-4 rounded text-[#0b57d0] accent-[#0b57d0] dark:accent-[#a8c7fa] cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3.5',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.className
                        )}
                      >
                        {col.render ? col.render(item, startIndex + index) : item[col.key]}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
            ) : (
              // Empty State
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto px-4">
                    <div className={cn(
                      'w-14 h-14 rounded-3xl flex items-center justify-center mb-3',
                      isDark ? 'bg-[#282a2d] text-[#a8c7fa]' : 'bg-[#f0f4f9] text-[#0b57d0]'
                    )}>
                      <Layers size={26} />
                    </div>
                    <div className={cn('text-base font-bold', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                      {emptyMessage}
                    </div>
                    <div className={cn('text-xs mt-1 mb-4 text-center', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                      {emptySubtitle}
                    </div>
                    {emptyAction && (
                      <M3Button variant="tonal" size="sm" onClick={emptyAction.onClick}>
                        {emptyAction.label}
                      </M3Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={cn(
        'p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
        isDark ? 'border-[#2d2f31] text-[#8e918f]' : 'border-[#e1e3e1]/60 text-[#5f6368]'
      )}>
        {/* Left: Summary */}
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className={isDark ? 'text-white' : 'text-black'}>{totalItems > 0 ? startIndex + 1 : 0}</strong>–<strong className={isDark ? 'text-white' : 'text-black'}>{endIndex}</strong> of <strong className={isDark ? 'text-white' : 'text-black'}>{totalItems}</strong> entries
          </span>

          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5 ml-4">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={cn(
                'px-2 py-1 rounded-lg outline-none font-medium border text-xs cursor-pointer',
                isDark
                  ? 'bg-[#1e1f20] text-white border-[#3c4043]'
                  : 'bg-[#f0f4f9] text-[#1f1f1f] border-[#c4c7c5]'
              )}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={validPage <= 1}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validPage <= 1}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-2.5 font-medium">
            Page {validPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={validPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </M3Card>
  );
}
