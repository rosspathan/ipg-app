import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getCommissionTypeLabel, getCommissionTypeColor, formatBSKAmount } from '@/lib/commissionExport';
import type { CommissionRecord } from '@/hooks/useAdminCommissions';

interface CommissionDataTableProps {
  commissions: CommissionRecord[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function CommissionDataTable({
  commissions,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: CommissionDataTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Earner</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Badge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No commissions found
                </TableCell>
              </TableRow>
            ) : (
              commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell className="text-sm">
                    {format(new Date(commission.created_at), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">@{commission.earner_username}</p>
                      <p className="text-xs text-muted-foreground">{commission.earner_full_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">@{commission.payer_username}</p>
                      <p className="text-xs text-muted-foreground">{commission.payer_full_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${getCommissionTypeColor(commission.commission_type)}`}>
                      {getCommissionTypeLabel(commission.commission_type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {commission.level ? (
                      <Badge variant="outline" className="text-xs">
                        L{commission.level}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-green-600">
                      +{formatBSKAmount(commission.bsk_amount)} BSK
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={commission.destination === 'withdrawable' ? 'default' : 'secondary'}>
                      {commission.destination}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{commission.payer_badge}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
