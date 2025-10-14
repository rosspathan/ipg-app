import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserFinancialSearchProps {
  onUserSelect: (userId: string) => void;
}

interface UserResult {
  id: string;
  email: string;
  display_name?: string;
  phone?: string;
}

export function UserFinancialSearch({ onUserSelect }: UserFinancialSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, phone")
        .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setResults(
        data?.map((p) => ({
          id: p.user_id,
          email: p.email || "",
          display_name: p.display_name || undefined,
          phone: p.phone || undefined,
        })) || []
      );
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "Could not search users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by email, name, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onUserSelect(user.id)}
            >
              <User className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">{user.display_name || user.email}</div>
                {user.display_name && (
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
