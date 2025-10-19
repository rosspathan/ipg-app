import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ProgramsLaneUltra } from "@/components/programs-pro/ProgramsLaneUltra"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { useProgramPresentation } from "@/hooks/useProgramPresentation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Sparkles, TrendingUp, Star } from "lucide-react"

export default function ProgramsHub() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState("all")

  const { programs: featuredPrograms } = useProgramPresentation({ featured: true })
  const { programs: trendingPrograms } = useProgramPresentation({ trending: true })
  const { programs: seasonalPrograms } = useProgramPresentation({ seasonal: true })
  const { programs: allPrograms, isLoading } = useProgramPresentation()

  const categories = React.useMemo(() => {
    const cats = new Set(allPrograms.map(p => p.category))
    return ["all", ...Array.from(cats)]
  }, [allPrograms])

  const filteredPrograms = React.useMemo(() => {
    let filtered = allPrograms

    if (activeCategory !== "all") {
      filtered = filtered.filter(p => p.category === activeCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.subtitle.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [allPrograms, activeCategory, searchQuery])

  const mapProgramToTile = (program: any): any => ({
    id: program.id,
    title: program.name,
    subtitle: program.subtitle,
    icon: program.icon ? (
      <img src={program.icon} alt={program.name} className="w-6 h-6" />
    ) : (
      <Sparkles className="h-5 w-5 text-primary" />
    ),
    badge: program.featured ? ("featured" as const) : undefined,
    onPress: () => navigate(`/programs/${program.key}`),
    onKebabPress: () => console.log("Kebab pressed", program.id)
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading programs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Programs Hub</h1>
          <p className="text-muted-foreground mb-4">
            Explore all available programs and opportunities
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs, tags, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Featured Lane */}
        {featuredPrograms.length > 0 && (
          <ProgramsLaneUltra
            programs={featuredPrograms.map(mapProgramToTile)}
            onViewAll={() => setActiveCategory("all")}
          />
        )}

        {/* Trending Lane */}
        {trendingPrograms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingPrograms.slice(0, 4).map((program) => {
                const tile = mapProgramToTile(program)
                return (
                  <ProgramTileUltra
                    key={tile.id}
                    icon={tile.icon}
                    title={tile.title}
                    subtitle={tile.subtitle}
                    badge={tile.badge}
                    onPress={tile.onPress}
                    onKebabPress={tile.onKebabPress}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Seasonal Lane */}
        {seasonalPrograms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Seasonal Offers</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {seasonalPrograms.slice(0, 4).map((program) => {
                const tile = mapProgramToTile(program)
                return (
                  <ProgramTileUltra
                    key={tile.id}
                    icon={tile.icon}
                    title={tile.title}
                    subtitle={tile.subtitle}
                    badge={tile.badge}
                    onPress={tile.onPress}
                    onKebabPress={tile.onKebabPress}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* All Programs with Categories */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Programs</h2>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="mb-4">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPrograms.map((program) => {
                  const tile = mapProgramToTile(program)
                  return (
                    <ProgramTileUltra
                      key={tile.id}
                      icon={tile.icon}
                      title={tile.title}
                      subtitle={tile.subtitle}
                      badge={tile.badge}
                      onPress={tile.onPress}
                      onKebabPress={tile.onKebabPress}
                    />
                  )
                })}
              </div>

              {filteredPrograms.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No programs found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
