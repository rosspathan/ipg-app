import { useState } from "react";
import { Search, Filter, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { useUserBadge } from "@/hooks/useUserBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function BadgeMarketplaceScreen() {
  const navigate = useNavigate();
  const { badge: currentBadge } = useUserBadge();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "price-low" | "price-high">("popular");
  const [filterBy, setFilterBy] = useState<"all" | "affordable" | "premium">("all");

  const { data: badgeThresholds, isLoading } = useQuery({
    queryKey: ['badge-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_thresholds')
        .select('*')
        .order('badge_bsk_cost', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: badgeCounts } = useQuery({
    queryKey: ['badge-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badge_holdings')
        .select('current_badge');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.current_badge) {
          counts[item.current_badge] = (counts[item.current_badge] || 0) + 1;
        }
      });
      return counts;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const badges = badgeThresholds?.map(threshold => ({
    id: threshold.id,
    name: threshold.badge_name,
    description: threshold.description || `Unlock ${threshold.unlock_levels} referral levels and earn ${threshold.bonus_bsk_holding} BSK bonus`,
    cost: threshold.bsk_threshold,
    fullPrice: threshold.bsk_threshold,
    unlockLevels: threshold.unlock_levels,
    bonusBSK: threshold.bonus_bsk_holding,
    holders: badgeCounts?.[threshold.badge_name] || 0,
    isCurrent: currentBadge === threshold.badge_name,
    isPurchased: false,
    canUpgrade: true,
    isUpgrade: false,
    isLowerTier: false,
    canPurchase: true
  })) || [];

  // Apply filters and sorting
  let filteredBadges = badges.filter(badge => 
    badge.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filterBy === "affordable") {
    filteredBadges = filteredBadges.filter(badge => badge.cost < 10000);
  } else if (filterBy === "premium") {
    filteredBadges = filteredBadges.filter(badge => badge.cost >= 10000);
  }

  if (sortBy === "price-low") {
    filteredBadges.sort((a, b) => a.cost - b.cost);
  } else if (sortBy === "price-high") {
    filteredBadges.sort((a, b) => b.cost - a.cost);
  } else {
    filteredBadges.sort((a, b) => b.holders - a.holders);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/badges')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Badge Marketplace</h1>
          <p className="text-sm text-muted-foreground">Explore and unlock exclusive badges</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search badges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Badges</SelectItem>
            <SelectItem value="affordable">Affordable</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Badge Grid */}
      <BadgeGrid 
        badges={filteredBadges}
        onPurchase={() => {}}
        isProcessing={false}
      />

      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No badges found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
