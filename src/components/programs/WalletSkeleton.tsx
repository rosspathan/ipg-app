import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function WalletSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>

      {/* Assets List */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
