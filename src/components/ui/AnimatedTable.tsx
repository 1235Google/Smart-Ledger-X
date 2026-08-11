import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface AnimatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function AnimatedTable<T>({
  data,
  columns,
  keyExtractor,
  emptyState,
  className = '',
  onRowClick,
}: AnimatedTableProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  if (data.length === 0 && emptyState) {
    return <div className="w-full">{emptyState}</div>;
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl', className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-white/[0.03]">
            {columns.map((col) => (
              <th key={col.key} className={cn('p-4 px-6', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-sm text-slate-200">
          <AnimatePresence mode="popLayout">
            {data.map((item, index) => {
              const rowKey = keyExtractor(item);
              return (
                <motion.tr
                  key={rowKey}
                  layout={!shouldReduceMotion}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 12, scale: 0.99 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -20, height: 0, padding: 0 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 28,
                    delay: shouldReduceMotion ? 0 : index * 0.04,
                  }}
                  whileHover={
                    !shouldReduceMotion
                      ? {
                          y: -1,
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          transition: { duration: 0.15 },
                        }
                      : undefined
                  }
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer select-none' : ''
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('p-4 px-6', col.className)}>
                      {col.render(item, index)}
                    </td>
                  ))}
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

export default AnimatedTable;
