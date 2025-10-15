import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Play, Pause } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function DrawScheduler() {
  const isMobile = useIsMobile();
  const [draws, setDraws] = useState([
    {
      id: "1",
      name: "Weekend Mega Draw",
      scheduledAt: "2025-10-18T18:00:00",
      prizePool: 50000,
      ticketsSold: 78,
      poolSize: 100,
      status: "scheduled"
    },
    {
      id: "2",
      name: "Daily Quick Draw",
      scheduledAt: "2025-10-15T20:00:00",
      prizePool: 10000,
      ticketsSold: 100,
      poolSize: 100,
      status: "ready"
    }
  ]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scheduled Draws</CardTitle>
            <Button size={isMobile ? "sm" : "default"}>
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
                    {draw.prizePool.toLocaleString()} BSK
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tickets</p>
                  <p className="text-sm font-semibold">
                    {draw.ticketsSold}/{draw.poolSize}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fill Rate</p>
                  <p className="text-sm font-semibold">
                    {Math.round((draw.ticketsSold / draw.poolSize) * 100)}%
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
                {draw.status === "ready" && (
                  <Button size="sm" className="flex-1">
                    <Play className="w-3 h-3 mr-2" />
                    Execute Draw
                  </Button>
                )}
                {draw.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="flex-1">
                    <Pause className="w-3 h-3 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button size="sm" variant="ghost">
                  Details
                </Button>
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
  );
}
