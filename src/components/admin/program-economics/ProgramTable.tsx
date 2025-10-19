import { useState } from "react";
import { Edit, MoreVertical, Pause, Play, Copy, Trash2 } from "lucide-react";
import { BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramStatusBadge } from "./ProgramStatusBadge";
import { ProgramModal } from "./ProgramModal";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";

interface ProgramTableProps {
  programs: ProgramWithConfig[];
  isLoading: boolean;
  onRefetch: () => void;
  onViewAnalytics?: (program: ProgramWithConfig) => void;
}

export function ProgramTable({ programs, isLoading, onRefetch, onViewAnalytics }: ProgramTableProps) {
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (program: ProgramWithConfig) => {
    setSelectedProgram(program);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProgram(null);
    onRefetch();
  };

  const getKeyMetrics = (program: ProgramWithConfig) => {
    const config = program.currentConfig;
    if (!config) return { metric1: "-", metric2: "-" };

    switch (program.key) {
      case "lucky_draw":
        return {
          metric1: `${config.ticket_price || 0} BSK/ticket`,
          metric2: `Pool: ${config.pool_size || 0}`,
        };
      case "spin_wheel":
        return {
          metric1: `${config.min_bet || 0}-${config.max_bet || 0} BSK`,
          metric2: `${config.free_spins_per_day || 0} free/day`,
        };
      case "ad_mining":
        return {
          metric1: `${config.reward_per_ad || 0} BSK/ad`,
          metric2: `${config.daily_limit || 0} ads/day`,
        };
      default:
        return { metric1: "-", metric2: "-" };
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Key Metrics</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground mb-4">No programs found</p>
        <Button>Create Your First Program</Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Key Metrics</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => {
              const metrics = getKeyMetrics(program);
              return (
                <TableRow key={program.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{program.name}</div>
                      <div className="text-sm text-muted-foreground">{program.key}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProgramStatusBadge status={program.currentConfig?.status || "draft"} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>{metrics.metric1}</div>
                      <div className="text-muted-foreground">{metrics.metric2}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">v{program.currentConfig?.version || 1}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onViewAnalytics && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewAnalytics(program)}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Analytics
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(program)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            {program.currentConfig?.status === "published" ? (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedProgram && (
        <ProgramModal
          program={selectedProgram}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onRefetch={onRefetch}
        />
      )}
    </>
  );
}
