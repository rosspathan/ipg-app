import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { openUrl } from "@/utils/linkHandler";

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  announcement_type: "text" | "image_carousel";
  images: string[];
  status: "draft" | "active" | "inactive";
  display_order: number;
}

export function AnnouncementCarousel() {
  const { data: announcements } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "active")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Announcement[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const handleAnnouncementClick = (linkUrl: string | null) => {
    if (linkUrl) {
      openUrl(linkUrl);
    }
  };

  return (
    <div className="w-full mb-6">
      {announcements.length === 1 ? (
        // Single announcement - no carousel
        <AnnouncementCard
          announcement={announcements[0]}
          onClick={() => handleAnnouncementClick(announcements[0].link_url)}
        />
      ) : (
        // Multiple announcements - use carousel
        <Carousel className="w-full">
          <CarouselContent>
            {announcements.map((announcement) => (
              <CarouselItem key={announcement.id}>
                <AnnouncementCard
                  announcement={announcement}
                  onClick={() => handleAnnouncementClick(announcement.link_url)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {announcements.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement, onClick }: { announcement: Announcement; onClick: () => void }) {
  const hasLink = !!announcement.link_url;

  if (announcement.announcement_type === "text") {
    return (
      <Alert
        className={`${hasLink ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}`}
        onClick={hasLink ? onClick : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <AlertTitle className="font-semibold">{announcement.title}</AlertTitle>
            {announcement.content && (
              <AlertDescription className="mt-2 whitespace-pre-wrap">
                {announcement.content}
              </AlertDescription>
            )}
          </div>
          {hasLink && (
            <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0 text-muted-foreground" />
          )}
        </div>
      </Alert>
    );
  }

  // Image carousel type
  if (announcement.images && announcement.images.length > 0) {
    return (
      <Card
        className={`overflow-hidden ${hasLink ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
        onClick={hasLink ? onClick : undefined}
      >
        <CardContent className="p-0">
          {announcement.images.length === 1 ? (
            <div className="relative">
              <img
                src={announcement.images[0]}
                alt={announcement.title}
                className="w-full h-48 object-cover"
              />
              {hasLink && (
                <div className="absolute top-2 right-2 bg-background/80 p-2 rounded-full">
                  <ExternalLink className="h-4 w-4" />
                </div>
              )}
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent>
                {announcement.images.map((imageUrl, idx) => (
                  <CarouselItem key={idx}>
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt={`${announcement.title} - ${idx + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      {hasLink && idx === 0 && (
                        <div className="absolute top-2 right-2 bg-background/80 p-2 rounded-full">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          )}
          {announcement.title && (
            <div className="p-4">
              <h3 className="font-semibold">{announcement.title}</h3>
              {announcement.content && (
                <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}