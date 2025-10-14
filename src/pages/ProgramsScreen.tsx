import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, Gift } from "lucide-react";
import { ProgramGridCompact } from "@/components/programs-pro/ProgramGridCompact";
import { ProgramTileUltra, type TileBadgeType } from "@/components/programs-pro/ProgramTileUltra";
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms";
import { Loader2 } from "lucide-react";

const ProgramsScreen = () => {
  const { programs, isLoading, isUsingDefaults } = useActivePrograms();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="mr-2">
              <Link to="/app/home">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-[var(--font-heading)] font-bold text-foreground">Programs</h1>
              <p className="text-xs text-muted-foreground">Explore all programs</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading programs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon"
            asChild
            className="mr-2"
          >
            <Link to="/app/home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-[var(--font-heading)] font-bold text-foreground">Programs</h1>
            <p className="text-xs text-muted-foreground">Explore all programs</p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            <span className="font-bold">New:</span> BSK Purchase Bonus - Get 50% extra!
          </p>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="px-4 py-6 flex-1">
        {isUsingDefaults && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Using default programs. Configure in admin panel for custom programs.
            </p>
          </div>
        )}
        
        <ProgramGridCompact>
          {programs.map((program) => {
            const IconComponent = getLucideIcon(program.icon);
            return (
              <Link key={program.id} to={program.route}>
                <ProgramTileUltra
                  icon={<IconComponent className="w-5 h-5" />}
                  title={program.name}
                  subtitle={program.description}
                  badge={program.badge as TileBadgeType}
                />
              </Link>
            );
          })}
        </ProgramGridCompact>
      </div>
    </div>
  );
};

export default ProgramsScreen;