import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ReferralCommissionHistory } from "@/components/referrals/ReferralCommissionHistory"

export default function CommissionHistory() {
  return (
    <ProgramPageTemplate 
      title="Commission History" 
      subtitle="Complete earnings breakdown with direct commissions, team income & VIP rewards"
    >
      <div className="pb-24">
        <ReferralCommissionHistory />
      </div>
    </ProgramPageTemplate>
  )
}
