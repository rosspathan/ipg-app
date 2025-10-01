import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailSheetTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tabs?: DetailSheetTab[];
  children?: React.ReactNode;
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
      loading?: boolean;
      disabled?: boolean;
    };
    secondary?: {
      label: string;
      onClick: () => void;
    };
  };
  showSaveBar?: boolean;
  className?: string;
}

/**
 * DetailSheet - Off-canvas record inspector/edit
 * - Slides up from bottom on mobile
 * - Tab navigation for different views
 * - Sticky save bar at bottom
 * - Full-height scrollable content
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  tabs,
  children,
  actions,
  showSaveBar = true,
  className,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="detail-sheet"
        side="bottom"
        className={cn(
          "bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]",
          "h-[90vh] flex flex-col",
          className
        )}
      >
        {/* Header */}
        <SheetHeader className="pb-4 border-b border-[hsl(225_24%_22%/0.16)]">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {tabs ? (
            <Tabs defaultValue={tabs[0]?.id} className="h-full flex flex-col">
              <TabsList className="w-full justify-start border-b border-[hsl(225_24%_22%/0.16)] rounded-none bg-transparent p-0">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-hidden">
                {tabs.map((tab) => (
                  <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="h-full mt-0 pt-4"
                  >
                    <ScrollArea className="h-full pr-4">
                      {tab.content}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          ) : (
            <ScrollArea className="h-full pt-4 pr-4">
              {children}
            </ScrollArea>
          )}
        </div>

        {/* Sticky Action Bar */}
        {showSaveBar && actions && (
          <div className="mt-4 pt-4 border-t border-[hsl(225_24%_22%/0.16)] flex gap-2">
            {actions.secondary && (
              <Button
                variant="outline"
                onClick={actions.secondary.onClick}
                className="flex-1 bg-transparent border-[hsl(225_24%_22%/0.16)] hover:bg-[hsl(229_30%_16%)]"
              >
                {actions.secondary.label}
              </Button>
            )}
            {actions.primary && (
              <Button
                onClick={actions.primary.onClick}
                disabled={actions.primary.disabled || actions.primary.loading}
                className={cn(
                  "flex-1 bg-gradient-to-br from-primary to-secondary",
                  "hover:opacity-90 transition-opacity"
                )}
              >
                {actions.primary.loading ? "Saving..." : actions.primary.label}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
