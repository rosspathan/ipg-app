import React, { useState } from "react";
import {
  useHotWalletSolvency,
  usePersistSolvencySnapshot,
  useDriftUsers,
  useRepairDrift,
  useCircuitBreakers,
  useToggleCircuitBreaker,
  useRefillHistory,
  useRecordRefill,
  useFeeOwnership,
  type TokenSolvency,
} from "@/hooks/useHotWalletSolvency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Lock,
  Unlock,
  Plus,
  TrendingDown,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HOT_WALLET = "0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5";

function fmt(n: number | string | undefined, d = 4): string {
  const x = Number(n ?? 0);
  if (!isFinite(x)) return "0";
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function statusBadge(status: string) {
  if (status === "solvent") {
    return (
      <Badge className="bg-success/15 text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Solvent
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30">
        <AlertCircle className="h-3 w-3 mr-1" /> Warning
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30">
      <ShieldAlert className="h-3 w-3 mr-1" /> Insolvent
    </Badge>
  );
}

export default function AdminHotWalletSolvency() {
  const { data: solvency, isLoading, refetch, isFetching } =
    useHotWalletSolvency();
  const persist = usePersistSolvencySnapshot();
  const { data: breakers } = useCircuitBreakers();
  const toggleBreaker = useToggleCircuitBreaker();
  const { data: refills } = useRefillHistory();
  const recordRefill = useRecordRefill();
  const { data: fees } = useFeeOwnership();

  const [selectedDriftAsset, setSelectedDriftAsset] = useState<string>("USDT");
  const { data: driftUsers, isLoading: driftLoading } = useDriftUsers(
    selectedDriftAsset,
  );
  const repair = useRepairDrift();

  const [refillForm, setRefillForm] = useState({
    asset_symbol: "USDT",
    expected_amount: "",
    detected_amount: "",
    tx_hash: "",
    from_address: "",
    notes: "",
  });
  const [showRefillDialog, setShowRefillDialog] = useState(false);

  const totals = (solvency?.results || []).reduce(
    (acc, r) => {
      acc.liability += Number(r.total_user_liability) || 0;
      acc.fees += Number(r.platform_fees_owed) || 0;
      acc.shortfall +=
        Number(r.surplus_or_deficit) < 0 ? Number(r.surplus_or_deficit) : 0;
      acc.surplus +=
        Number(r.surplus_or_deficit) > 0 ? Number(r.surplus_or_deficit) : 0;
      return acc;
    },
    { liability: 0, fees: 0, shortfall: 0, surplus: 0 },
  );

  const insolventCount = (solvency?.results || []).filter(
    (r) => r.status === "insolvent",
  ).length;

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Trading Hot Wallet Solvency
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {HOT_WALLET}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh Live
          </Button>
          <Button
            size="sm"
            onClick={() => persist.mutate()}
            disabled={persist.isPending}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            Persist Snapshot + Auto-Breaker
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowRefillDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Refill
          </Button>
        </div>
      </div>

      {/* Global alert */}
      {insolventCount > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>
            {insolventCount} token{insolventCount > 1 ? "s" : ""} insolvent
          </AlertTitle>
          <AlertDescription>
            Total deficit: {fmt(totals.shortfall)} (across all tokens). Persist
            snapshot to auto-trigger circuit breakers and pause withdrawals.
          </AlertDescription>
        </Alert>
      )}

      {/* Token Solvency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-24" />
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          : solvency?.results.map((r) => <TokenCard key={r.asset_symbol} r={r} />)}
      </div>

      <Tabs defaultValue="drift" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drift">Drift Users</TabsTrigger>
          <TabsTrigger value="breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="refills">Refill History</TabsTrigger>
          <TabsTrigger value="fees">Fee Ownership</TabsTrigger>
        </TabsList>

        {/* Drift Users tab */}
        <TabsContent value="drift" className="space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Balance vs Ledger Drift Users
              </CardTitle>
              <Select
                value={selectedDriftAsset}
                onValueChange={setSelectedDriftAsset}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(solvency?.results || []).map((r) => (
                    <SelectItem key={r.asset_symbol} value={r.asset_symbol}>
                      {r.asset_symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {driftLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !driftUsers || driftUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No drift detected for {selectedDriftAsset}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Table Avail</TableHead>
                        <TableHead className="text-right">Ledger Avail</TableHead>
                        <TableHead className="text-right">Drift</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driftUsers.map((u) => (
                        <DriftRow
                          key={u.user_id}
                          user={u}
                          onRepair={(decision, reason) =>
                            repair.mutate({
                              user_id: u.user_id,
                              asset_symbol: u.asset_symbol,
                              decision,
                              reason,
                              batch_id: crypto.randomUUID(),
                            })
                          }
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Circuit breakers tab */}
        <TabsContent value="breakers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Active Withdrawal Circuit Breakers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!breakers || breakers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active breakers. All withdrawals enabled.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Drift</TableHead>
                      <TableHead>Frozen At</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakers.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono">
                          {b.asset_symbol}
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.frozen_reason}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(b.drift_amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(b.frozen_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleBreaker.mutate({
                                asset_symbol: b.asset_symbol,
                                freeze: false,
                                reason: "Manual release",
                              })
                            }
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Release
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refill history tab */}
        <TabsContent value="refills">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Refill History</CardTitle>
            </CardHeader>
            <CardContent>
              {!refills || refills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No refills recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Detected</TableHead>
                      <TableHead>TX</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refills.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.asset_symbol}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(r.expected_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(r.detected_amount)}
                        </TableCell>
                        <TableCell>
                          {r.tx_hash ? (
                            <a
                              className="text-primary underline text-xs font-mono"
                              href={`https://bscscan.com/tx/${r.tx_hash}`}
                              target="_blank"
                              rel="noopener"
                            >
                              {r.tx_hash.slice(0, 10)}…
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "confirmed"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee ownership tab */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Platform Fee Ownership (Internal Separation)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!fees || fees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fee ledger entries yet. Fees are still tracked in
                  trading_fees_collected (commingled with user funds).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Accrued</TableHead>
                      <TableHead className="text-right">Swept</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map((f) => (
                      <TableRow key={f.asset_symbol}>
                        <TableCell className="font-mono">
                          {f.asset_symbol}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(f.accrued_fees)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(f.swept_fees)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(f.outstanding_fees)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record refill dialog */}
      <Dialog open={showRefillDialog} onOpenChange={setShowRefillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Hot Wallet Refill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Asset</Label>
              <Select
                value={refillForm.asset_symbol}
                onValueChange={(v) =>
                  setRefillForm({ ...refillForm, asset_symbol: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USDT", "BSK", "IPG", "USDI", "BNB"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Expected (sent)</Label>
                <Input
                  type="number"
                  value={refillForm.expected_amount}
                  onChange={(e) =>
                    setRefillForm({
                      ...refillForm,
                      expected_amount: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Detected (on-chain)</Label>
                <Input
                  type="number"
                  value={refillForm.detected_amount}
                  onChange={(e) =>
                    setRefillForm({
                      ...refillForm,
                      detected_amount: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>TX Hash</Label>
              <Input
                value={refillForm.tx_hash}
                onChange={(e) =>
                  setRefillForm({ ...refillForm, tx_hash: e.target.value })
                }
                placeholder="0x…"
              />
            </div>
            <div>
              <Label>From Address</Label>
              <Input
                value={refillForm.from_address}
                onChange={(e) =>
                  setRefillForm({
                    ...refillForm,
                    from_address: e.target.value,
                  })
                }
                placeholder="0x…"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={refillForm.notes}
                onChange={(e) =>
                  setRefillForm({ ...refillForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefillDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const sym = refillForm.asset_symbol;
                const r = solvency?.results.find((x) => x.asset_symbol === sym);
                const shortfallBefore =
                  r && Number(r.surplus_or_deficit) < 0
                    ? Math.abs(Number(r.surplus_or_deficit))
                    : 0;
                const detected = Number(refillForm.detected_amount);
                const surplusAfter =
                  r ? detected - shortfallBefore : 0;
                recordRefill.mutate(
                  {
                    asset_symbol: sym,
                    expected_amount: Number(refillForm.expected_amount),
                    detected_amount: detected,
                    tx_hash: refillForm.tx_hash,
                    from_address: refillForm.from_address,
                    shortfall_before: shortfallBefore,
                    surplus_after: surplusAfter,
                    notes: refillForm.notes,
                  },
                  {
                    onSuccess: () => {
                      setShowRefillDialog(false);
                      setRefillForm({
                        asset_symbol: "USDT",
                        expected_amount: "",
                        detected_amount: "",
                        tx_hash: "",
                        from_address: "",
                        notes: "",
                      });
                    },
                  },
                );
              }}
              disabled={recordRefill.isPending}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TokenCard({ r }: { r: TokenSolvency }) {
  const deficit = Number(r.surplus_or_deficit);
  return (
    <Card className={r.status === "insolvent" ? "border-destructive/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono">{r.asset_symbol}</CardTitle>
          {statusBadge(r.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="On-Chain" value={fmt(r.actual_onchain_balance)} mono />
        <Row label="Required" value={fmt(r.required_balance)} mono />
        <div
          className={`flex justify-between font-bold ${deficit < 0 ? "text-destructive" : "text-success"}`}
        >
          <span>{deficit < 0 ? "Deficit" : "Surplus"}</span>
          <span className="font-mono">{fmt(Math.abs(deficit))}</span>
        </div>
        <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
          <Row label="User Available" value={fmt(r.user_available)} mono small />
          <Row label="User Locked" value={fmt(r.user_locked)} mono small />
          <Row
            label="Pending Withdrawals"
            value={fmt(r.pending_withdrawals)}
            mono
            small
          />
          <Row label="Fees Owed" value={fmt(r.platform_fees_owed)} mono small />
          {r.drift_users_count > 0 && (
            <div className="flex items-center gap-1 text-warning mt-2">
              <TrendingDown className="h-3 w-3" />
              <span>
                {r.drift_users_count} drift user
                {r.drift_users_count > 1 ? "s" : ""} ({fmt(r.total_drift_amount)})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${small ? "text-xs" : "text-sm"}`}
    >
      <span>{label}</span>
      <span className={mono ? "font-mono tabular-nums" : ""}>{value}</span>
    </div>
  );
}

function DriftRow({
  user,
  onRepair,
}: {
  user: any;
  onRepair: (decision: "trust_balance_table" | "trust_ledger", reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] =
    useState<"trust_balance_table" | "trust_ledger">("trust_balance_table");
  const [reason, setReason] = useState("");

  return (
    <>
      <TableRow>
        <TableCell className="text-xs">
          <div className="font-medium">{user.username}</div>
          <div className="text-muted-foreground font-mono">
            {user.user_id.slice(0, 8)}…
          </div>
        </TableCell>
        <TableCell className="text-right font-mono">
          {fmt(user.table_available)}
        </TableCell>
        <TableCell className="text-right font-mono">
          {fmt(user.ledger_available)}
        </TableCell>
        <TableCell
          className={`text-right font-mono ${Number(user.total_drift) > 0 ? "text-warning" : "text-destructive"}`}
        >
          {fmt(user.total_drift)}
        </TableCell>
        <TableCell>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Repair
          </Button>
        </TableCell>
      </TableRow>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair Drift — {user.asset_symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <strong>User:</strong> {user.username}
            </div>
            <div>
              <strong>Balance Table:</strong> {fmt(user.table_available)} avail /{" "}
              {fmt(user.table_locked)} locked
            </div>
            <div>
              <strong>Ledger:</strong> {fmt(user.ledger_available)} avail /{" "}
              {fmt(user.ledger_locked)} locked
            </div>
            <div>
              <strong>Drift:</strong> {fmt(user.total_drift)}
            </div>
            <div>
              <Label>Decision</Label>
              <Select
                value={decision}
                onValueChange={(v: any) => setDecision(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trust_balance_table">
                    Trust Balance Table (insert ledger entries to match)
                  </SelectItem>
                  <SelectItem value="trust_ledger">
                    Trust Ledger (correct balance table down)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Pre-ledger refund, missing manual credit, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                onRepair(decision, reason);
                setOpen(false);
              }}
            >
              Apply Repair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
