import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ExternalLink, Users, TrendingUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getLucideIcon } from "@/hooks/useActivePrograms";

export default function ProgramDetailPage() {
  const { programKey } = useParams();
  const navigate = useNavigate();

  const { data: program, isLoading } = useQuery({
    queryKey: ["program-detail", programKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_modules")
        .select("*")
        .eq("key", programKey)
        .eq("status", "live")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleParticipate = () => {
    if (program?.route) {
      navigate(program.route);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-background pb-20">
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (!program) {
    return (
      <>
        <div className="min-h-screen bg-background pb-20">
          <div className="p-4">
            <Button variant="ghost" onClick={() => navigate("/app/programs")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Button>
            <Card className="p-8 text-center mt-4">
              <p className="text-muted-foreground">Program not found</p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const Icon = getLucideIcon(program.icon);
  const faqs = Array.isArray(program.faqs) ? program.faqs : [];
  const tags = Array.isArray(program.tags) ? program.tags : [];

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          {/* Back Button */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/programs")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Program Header */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold">{program.name}</h1>
                  {program.status === "live" && (
                    <Badge variant="outline">Live</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {program.name}
                </p>
                {program.category && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {program.category}
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Participants</span>
                </div>
                <p className="text-lg font-semibold">
                  {Math.floor(Math.random() * 10000)}+
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Category</span>
                </div>
                <p className="text-lg font-semibold capitalize">
                  {program.category}
                </p>
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              size="lg"
              onClick={handleParticipate}
            >
              Start Participating
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="font-semibold mb-3">About This Program</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {program.description || "No description available"}
            </p>
          </Card>

          {/* FAQs */}
          {faqs.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq: any, index: number) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-sm text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
