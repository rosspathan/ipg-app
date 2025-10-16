import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ParticipationFlow } from "@/components/programs-pro/ParticipationFlow"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function ProgramParticipate() {
  const { key } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const [amount, setAmount] = React.useState("")

  const { data: program, isLoading } = useQuery({
    queryKey: ["program-detail", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_modules")
        .select("*")
        .eq("key", key)
        .eq("status", "live")
        .single()

      if (error) throw error
      return data
    },
    enabled: !!key
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Program Not Found</h2>
          <Button onClick={() => navigate("/programs-hub")}>Back to Programs</Button>
        </div>
      </div>
    )
  }

  return (
    <ProgramPageTemplate
      title={program.name}
      subtitle="Participate Now"
      headerActions={
        <Button variant="ghost" onClick={() => navigate(`/programs-hub/${key}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      }
    >
      <ParticipationFlow
        moduleId={program.id}
        moduleName={program.name}
        participationType="entry"
        onComplete={() => {
          navigate(`/programs-hub/${key}`)
        }}
      >
        {({ programState, handleParticipate, isRecording }: any) => (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Participation Details</h3>
              <p className="text-sm text-muted-foreground">
                Complete the form below to participate in this program.
              </p>
            </div>

            {/* Generic Participation Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (Optional)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleParticipate({
                      inputData: { amount: parseFloat(amount) || 0 },
                      amountPaid: parseFloat(amount) || 0
                    })
                  }
                  disabled={isRecording}
                  className="flex-1"
                >
                  {isRecording ? "Processing..." : "Participate Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/programs-hub/${key}`)}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Program-specific Info */}
            {program.description && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">{program.description}</p>
              </Card>
            )}
          </div>
        )}
      </ParticipationFlow>
    </ProgramPageTemplate>
  )
}
