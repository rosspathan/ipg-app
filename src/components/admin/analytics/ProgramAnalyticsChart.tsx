import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  date: string;
  views: number;
  users: number;
  conversions: number;
}

interface ProgramAnalyticsChartProps {
  data: ChartData[];
  title: string;
  description?: string;
  type?: 'line' | 'area';
}

export function ProgramAnalyticsChart({ 
  data, 
  title, 
  description,
  type = 'area'
}: ProgramAnalyticsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Views"
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Users"
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                name="Conversions"
              />
            </LineChart>
          ) : (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="views" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
                name="Views"
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="hsl(var(--success))" 
                fill="hsl(var(--success) / 0.2)"
                strokeWidth={2}
                name="Users"
              />
              <Area 
                type="monotone" 
                dataKey="conversions" 
                stroke="hsl(var(--accent))" 
                fill="hsl(var(--accent) / 0.2)"
                strokeWidth={2}
                name="Conversions"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
