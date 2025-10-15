import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProgramAnalyticsDashboardProps {
  programType: "ad_mining" | "lucky_draw" | "spin_wheel";
}

export function ProgramAnalyticsDashboard({ programType }: ProgramAnalyticsDashboardProps) {
  const isMobile = useIsMobile();

  // Mock data for demonstration
  const weeklyData = [
    { day: "Mon", value: 145, users: 67 },
    { day: "Tue", value: 198, users: 89 },
    { day: "Wed", value: 176, users: 78 },
    { day: "Thu", value: 223, users: 95 },
    { day: "Fri", value: 267, users: 112 },
    { day: "Sat", value: 312, users: 134 },
    { day: "Sun", value: 289, users: 121 }
  ];

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    activity: Math.floor(Math.random() * 100) + 20
  }));

  const getTitleByType = () => {
    switch (programType) {
      case "ad_mining":
        return { main: "Ad Views", secondary: "Active Users" };
      case "lucky_draw":
        return { main: "Tickets Sold", secondary: "Participants" };
      case "spin_wheel":
        return { main: "Total Spins", secondary: "Active Players" };
    }
  };

  const titles = getTitleByType();

  return (
    <div className="space-y-4">
      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7-Day Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name={titles.main}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                name={titles.secondary}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">24-Hour Activity Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="hour"
                className="text-xs"
                interval={isMobile ? 5 : 3}
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="activity" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                      #{i}
                    </div>
                    <div>
                      <p className="text-sm font-medium">User {1000 + i}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 200) + 50} actions
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-success">
                    +{Math.floor(Math.random() * 5000) + 1000} BSK
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {programType === "ad_mining"
                        ? "Ad Watched"
                        : programType === "lucky_draw"
                        ? "Ticket Purchased"
                        : "Spin Played"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(Math.random() * 30)} mins ago
                    </p>
                  </div>
                  <span className="text-xs">User {1000 + i * 3}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
