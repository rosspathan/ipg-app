import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate";
import { VIPMilestoneHistory } from "@/components/referrals/VIPMilestoneHistory";

export default function VIPMilestoneHistoryPage() {
  return (
    <ProgramPageTemplate
      title="VIP Milestone History"
      subtitle="Track your achievements and rewards from building your VIP team"
    >
      <div className="pb-24">
        <VIPMilestoneHistory />
      </div>
    </ProgramPageTemplate>
  );
}
