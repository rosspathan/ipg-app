import { useAdminPurchaseOffers, useToggleOfferStatus, useDeletePurchaseOffer } from '@/hooks/useAdminPurchaseOffers';
import { OfferCreationDialog } from '@/components/admin/purchase-offers/OfferCreationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Trash2, TrendingUp, Lock, Users, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminOneTimeOffersPage() {
  const { data: offers, isLoading } = useAdminPurchaseOffers();
  const toggleMutation = useToggleOfferStatus();
  const deleteMutation = useDeletePurchaseOffer();

  const activeOffers = offers?.filter(o => o.is_active) || [];
  const inactiveOffers = offers?.filter(o => !o.is_active) || [];

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">One-Time Purchase Offers</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional purchase offers with bonus rewards
          </p>
        </div>
        <OfferCreationDialog />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Offers</CardDescription>
            <CardTitle className="text-2xl">{offers?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Offers</CardDescription>
            <CardTitle className="text-2xl text-success">{activeOffers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inactive Offers</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{inactiveOffers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Active Offers */}
      <Card>
        <CardHeader>
          <CardTitle>Active Offers</CardTitle>
          <CardDescription>Currently available for users to purchase</CardDescription>
        </CardHeader>
        <CardContent>
          {activeOffers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active offers
            </div>
          ) : (
            <div className="space-y-4">
              {activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{offer.campaign_name}</h4>
                        {offer.is_featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                      </div>
                      {offer.description && (
                        <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: offer.id, is_active: checked })}
                        disabled={toggleMutation.isPending}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Offer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the offer "{offer.campaign_name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(offer.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Purchase Amount</p>
                      <p className="font-semibold">{offer.purchase_amount_bsk.toLocaleString()} BSK</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span>Withdrawable</span>
                      </div>
                      <p className="font-semibold text-success">{offer.withdrawable_bonus_percent}%</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Lock className="h-3 w-3 text-primary" />
                        <span>Holding</span>
                      </div>
                      <p className="font-semibold text-primary">{offer.holding_bonus_percent}%</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Start</span>
                      </div>
                      <p className="font-medium text-xs">{format(new Date(offer.start_at), 'MMM dd, HH:mm')}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>End</span>
                      </div>
                      <p className="font-medium text-xs">{format(new Date(offer.end_at), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Offers */}
      {inactiveOffers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Offers</CardTitle>
            <CardDescription>Disabled or expired offers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 border rounded-lg space-y-3 opacity-60"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{offer.campaign_name}</h4>
                      {offer.description && (
                        <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: offer.id, is_active: checked })}
                        disabled={toggleMutation.isPending}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Offer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the offer "{offer.campaign_name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(offer.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{offer.purchase_amount_bsk.toLocaleString()} BSK</span>
                    <span>•</span>
                    <span>W: {offer.withdrawable_bonus_percent}%</span>
                    <span>•</span>
                    <span>H: {offer.holding_bonus_percent}%</span>
                    <span>•</span>
                    <span>{format(new Date(offer.end_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
