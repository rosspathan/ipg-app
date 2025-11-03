import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { UnifiedBSKHistory } from "@/components/bsk/UnifiedBSKHistory";
import { ProgramParticipationHistory } from "./ProgramParticipationHistory";
import { Activity, Coins, Trophy } from "lucide-react";

interface UnifiedActivityHistoryProps {
  userId?: string;
}

export const UnifiedActivityHistory = ({ userId }: UnifiedActivityHistoryProps) => {
  return (
    <Card className="p-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">All Activity</span>
            <span className="sm:hidden">All</span>
          </TabsTrigger>
          <TabsTrigger value="bsk" className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <span className="hidden sm:inline">BSK Transactions</span>
            <span className="sm:hidden">BSK</span>
          </TabsTrigger>
          <TabsTrigger value="programs" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Programs</span>
            <span className="sm:hidden">Programs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Recent BSK Transactions
              </h3>
              <UnifiedBSKHistory userId={userId} compact />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Recent Program Activities
              </h3>
              <ProgramParticipationHistory userId={userId} compact />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bsk">
          <UnifiedBSKHistory userId={userId} />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramParticipationHistory userId={userId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
