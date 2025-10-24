import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Award, BarChart3 } from "lucide-react";
import { HierarchicalTreeData } from "@/hooks/useHierarchicalReferralTree";

interface TreeStatsProps {
  data: HierarchicalTreeData;
}

export function TreeStats({ data }: TreeStatsProps) {
  if (!data.rootNode) return null;

  const stats = [
    {
      title: "Total Team",
      value: data.totalNodes,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Chain Depth",
      value: `${data.maxDepth} Levels`,
      icon: BarChart3,
      color: "text-purple-500",
    },
    {
      title: "VIP Members",
      value: data.rootNode.subTreeVIPCount,
      icon: Award,
      color: "text-yellow-500",
    },
    {
      title: "Total BSK Generated",
      value: `${data.rootNode.subTreeBSK.toFixed(0)}`,
      icon: TrendingUp,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
