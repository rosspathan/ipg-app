import { RefundFailedPurchases } from "@/components/admin/badge/RefundFailedPurchases";

export default function BadgePurchaseRefunds() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Badge Purchase Refunds</h1>
        <p className="text-muted-foreground mt-2">
          Manage and process refunds for failed badge purchases
        </p>
      </div>
      
      <RefundFailedPurchases />
    </div>
  );
}
