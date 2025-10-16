import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Play, Share2, Bookmark } from "lucide-react"
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar"

export default function ProgramDetail() {
  const { key } = useParams<{ key: string }>()
  const navigate = useNavigate()

  const { data: program, isLoading } = useQuery({
    queryKey: ["program-detail", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_modules")
        .select(`
          *,
          program_media(*),
          program_visibility_rules(*)
        `)
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Program Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The program you're looking for doesn't exist or is not available.
          </p>
          <Button onClick={() => navigate("/programs-hub")}>Browse Programs</Button>
        </div>
      </div>
    )
  }

  const bannerMedia = program.program_media?.find((m: any) => m.media_type === "banner")
  const iconMedia = program.program_media?.find((m: any) => m.media_type === "icon")

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <BacklinkBar programName={program.name} />
      <ProgramPageTemplate
        title={program.name}
        subtitle={(program as any).subtitle || ""}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate(`/programs-hub/${key}/participate`)}>
              <Play className="h-4 w-4 mr-2" />
              Start Now
            </Button>
          </div>
        }
      >
      {/* Hero Banner */}
      {bannerMedia?.file_url && (
        <div className="relative h-48 rounded-lg overflow-hidden mb-6">
          <img
            src={bannerMedia.file_url}
            alt={bannerMedia.alt_text || program.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="outline">{program.category}</Badge>
        {program.featured && <Badge variant="default">Featured</Badge>}
        {program.trending && <Badge variant="secondary">Trending</Badge>}
        {program.seasonal && <Badge variant="outline">Seasonal</Badge>}
        {Array.isArray((program as any).tags) && (program as any).tags.map((tag: string) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">About This Program</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {program.description || "No description available."}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="how-it-works">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">How It Works</h3>
            <div className="space-y-4">
              {(program as any).localized_content?.en?.how_it_works ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {(program as any).localized_content.en.how_it_works}
                </p>
              ) : (
                <p className="text-muted-foreground">Information coming soon.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="faqs">
          {Array.isArray((program as any).faqs) && (program as any).faqs.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {(program as any).faqs.map((faq: any, index: number) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="p-6">
              <p className="text-muted-foreground">No FAQs available yet.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="terms">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Terms & Conditions</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {program.terms_conditions || "Terms and conditions not available."}
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </ProgramPageTemplate>
    </div>
  )
}
