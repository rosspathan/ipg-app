import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-3 pb-1 border-t border-border/30">
      <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
        {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
            page === 0
              ? "text-muted-foreground/20 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-foreground tabular-nums min-w-[40px] text-center">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
            page >= totalPages - 1
              ? "text-muted-foreground/20 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
