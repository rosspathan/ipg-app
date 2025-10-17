import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Autoplay from "embla-carousel-autoplay";

interface CarouselImage {
  id: string;
  image_url: string;
  link_url?: string;
  title?: string;
  display_order: number;
}

export function ImageCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarouselImages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('carousel-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_carousels'
        },
        () => {
          fetchCarouselImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCarouselImages = async () => {
    try {
      const { data, error } = await supabase
        .from('image_carousels')
        .select('*')
        .eq('status', 'active')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching carousel images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (linkUrl?: string) => {
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-4">
        <Skeleton className="w-full h-48 rounded-xl" />
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 py-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {images.map((image) => (
            <CarouselItem key={image.id}>
              <Card 
                className={`overflow-hidden border-0 ${image.link_url ? 'cursor-pointer' : ''}`}
                onClick={() => handleImageClick(image.link_url)}
              >
                <img
                  src={image.image_url}
                  alt={image.title || 'Carousel image'}
                  className="w-full h-48 object-cover rounded-xl"
                />
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
    </div>
  );
}
