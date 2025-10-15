import { useState } from "react";
import { Link } from "react-router-dom";
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProgramsListPage() {
  const { programs, isLoading } = useActivePrograms();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Programs" },
    { id: "earn", label: "Earnings" },
    { id: "games", label: "Games" },
    { id: "finance", label: "Finance" },
  ];

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || program.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">All Programs</h1>
            <p className="text-sm text-muted-foreground">
              Explore all available programs and start earning
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap min-h-[44px]"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredPrograms.length} programs found
            </p>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="min-h-[44px] min-w-[44px]"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="min-h-[44px] min-w-[44px]"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Programs List/Grid */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredPrograms.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No programs found</p>
            </Card>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
              {filteredPrograms.map((program) => {
                const Icon = getLucideIcon(program.icon);
                return (
                  <Link key={program.id} to={`/app/programs/${program.key}`}>
                    <Card className="p-4 hover:bg-muted/50 transition-colors h-full">
                      <div className={viewMode === "grid" ? "space-y-3" : "flex items-center gap-4"}>
                        <div className={`${viewMode === "grid" ? "w-12 h-12 mx-auto" : "w-12 h-12 flex-shrink-0"} rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center`}>
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className={`flex-1 ${viewMode === "grid" ? "text-center" : ""}`}>
                          <div className="flex items-center gap-2 mb-1 justify-center">
                            <h3 className="font-semibold text-sm">{program.name}</h3>
                            {program.badge && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {program.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {program.description}
                          </p>
                        </div>
                        {viewMode === "list" && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
