import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Play, Pause } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDrawManagement } from "@/hooks/useDrawManagement";
import { DrawScheduleDialog } from "./DrawScheduleDialog";
import { DrawExecutionDialog } from "./DrawExecutionDialog";

export function DrawScheduler() {
  const isMobile = useIsMobile();
  const { draws, isLoading, createDraw, executeDraw, cancelDraw } = useDrawManagement();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<any>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading draws...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scheduled Draws</CardTitle>
              <Button size={isMobile ? "sm" : "default"} onClick={() => setScheduleDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Draw
              </Button>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          {draws.map((draw) => (
            <div
              key={draw.id}
              className="p-4 border border-border rounded-lg space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold mb-1">{draw.name}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(draw.scheduledAt)}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={
                    draw.status === "ready"
                      ? "default"
                      : draw.status === "scheduled"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {draw.status}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Prize Pool</p>
                  <p className="text-sm font-semibold">
                    {((draw.first_prize_amount || 0) + (draw.second_prize_amount || 0) + (draw.third_prize_amount || 0)).toLocaleString()} BSK
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entry Fee</p>
                  <p className="text-sm font-semibold">
                    {draw.entry_fee || 0} BSK
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Participants</p>
                  <p className="text-sm font-semibold">
                    {draw.current_participants || 0}/{draw.max_participants || 0}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(draw.ticketsSold / draw.poolSize) * 100}%`
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!draw.executed_at && (
                  <Button size="sm" className="flex-1" onClick={() => {
                    setSelectedDraw(draw);
                    setExecuteDialogOpen(true);
                  }}>
                    <Play className="w-3 h-3 mr-2" />
                    Execute Draw
                  </Button>
                )}
                {!draw.executed_at && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => cancelDraw(draw.id)}>
                    <Pause className="w-3 h-3 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}

          {draws.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No scheduled draws</p>
              <p className="text-xs mt-1">
                Click "Schedule Draw" to create one
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <DrawScheduleDialog
      open={scheduleDialogOpen}
      onOpenChange={setScheduleDialogOpen}
      onSchedule={(data) => createDraw(data)}
    />

    <DrawExecutionDialog
      open={executeDialogOpen}
      onOpenChange={setExecuteDialogOpen}
      drawName={selectedDraw?.name || ''}
      participants={selectedDraw?.current_participants || 0}
      onConfirm={() => {
        if (selectedDraw) executeDraw(selectedDraw.id);
      }}
    />
  </>
  );
}
