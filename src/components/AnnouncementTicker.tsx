import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Megaphone, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  display_order: number;
  status: string;
}

export const AnnouncementTicker: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchAnnouncements();

    // Real-time subscription for new announcements
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Auto-rotation disabled to prevent flicker
  }, [announcements.length]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }

    // Filter out dismissed announcements
    const dismissedIds = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    const filtered = (data || []).filter((a: Announcement) => !dismissedIds.includes(a.id));
    setAnnouncements(filtered);
    setDismissed(dismissedIds);
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissed, id];
    localStorage.setItem('dismissed_announcements', JSON.stringify(newDismissed));
    setDismissed(newDismissed);
    
    const filtered = announcements.filter(a => a.id !== id);
    setAnnouncements(filtered);
    
    if (filtered.length === 0) {
      setIsVisible(false);
    }
  };

  if (!isVisible || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  const getIcon = () => {
    switch (current.announcement_type) {
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'promotion': return <Sparkles className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (current.announcement_type) {
      case 'warning': return 'destructive';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="w-full">
      <Alert
        variant={getVariant()}
        className={cn(
          "relative border-l-4 rounded-none border-b",
          current.announcement_type === 'warning' && "border-l-destructive bg-destructive/10",
          current.announcement_type === 'success' && "border-l-success bg-success/10",
          current.announcement_type === 'promotion' && "border-l-primary bg-primary/10",
          current.announcement_type === 'info' && "border-l-info bg-info/10"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{getIcon()}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-sm font-semibold">{current.title}</strong>
              {announcements.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1}/{announcements.length}
                </span>
              )}
            </div>
            <AlertDescription className="text-sm mt-0.5">
              {current.content}
            </AlertDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-6 w-6 p-0"
            onClick={() => handleDismiss(current.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator for multiple announcements */}
        {announcements.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30">
            <div
              className="h-full bg-primary transition-all duration-[5000ms] ease-linear"
              style={{ width: `${((currentIndex + 1) / announcements.length) * 100}%` }}
            />
          </div>
        )}
      </Alert>
    </div>
  );
};
