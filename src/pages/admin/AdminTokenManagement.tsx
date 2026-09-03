import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Pencil, RefreshCw, Coins, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import CryptoLogo from "@/components/CryptoLogo";
import LogoUpload from "@/components/LogoUpload";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetRow {
  id: string;
  name: string;
  symbol: string;
  network: string;
  contract_address: string | null;
  decimals: number;
  initial_price: number | null;
  price_currency: string | null;
  logo_url: string | null;
  logo_file_path: string | null;
  is_active: boolean;
  trading_enabled: boolean;
  show_in_portfolio: boolean;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  asset_type: string;
  created_at: string;
}

interface MarketRow {
  id: string;
  base_asset_id: string;
  quote_asset_id: string;
  is_active: boolean;
}

interface PriceRow {
  market_id: string;
  symbol: string;
  current_price: number;
}

interface TokenForm {
  id?: string;
  name: string;
  symbol: string;
  network: string;
  contract_address: string;
  decimals: string;
  logo_url: string;
  logo_file_path: string | null;
  initial_price: string;
  pair_quote_id: string;
  trading_enabled: boolean;
  show_in_portfolio: boolean;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
}

const NETWORKS = ["BEP20", "ERC20", "TRC20", "Bitcoin", "Ethereum", "Solana", "Polygon", "Other"];

const emptyForm = (): TokenForm => ({
  name: "",
  symbol: "",
  network: "BEP20",
  contract_address: "",
  decimals: "18",
  logo_url: "",
  logo_file_path: null,
  initial_price: "",
  pair_quote_id: "",
  trading_enabled: true,
  show_in_portfolio: true,
  deposit_enabled: true,
  withdraw_enabled: true,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

function useTokenCatalog() {
  return useQuery({
    queryKey: ["admin-token-catalog"],
    queryFn: async () => {
      const [a, m, p] = await Promise.all([
        supabase
          .from("assets")
          .select(
            "id,name,symbol,network,contract_address,decimals,initial_price,price_currency,logo_url,logo_file_path,is_active,trading_enabled,show_in_portfolio,deposit_enabled,withdraw_enabled,asset_type,created_at"
          )
          .order("symbol"),
        supabase.from("markets").select("id,base_asset_id,quote_asset_id,is_active"),
        supabase.from("market_prices").select("market_id,symbol,current_price"),
      ]);
      if (a.error) throw a.error;
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      return {
        assets: (a.data ?? []) as AssetRow[],
        markets: (m.data ?? []) as MarketRow[],
        prices: (p.data ?? []) as PriceRow[],
      };
    },
  });
}

/** Invalidate every consumer so tokens show up instantly on trading + portfolio views. */
function invalidateTokenConsumers(qc: ReturnType<typeof useQueryClient>) {
  [
    "admin-token-catalog",
    "trading-pairs",
    "market-data",
    "user-balance",
    "trading-balances",
    "wallet-balances",
    "bep20-balances",
    "onchain-balances-all",
    "admin-dashboard-home",
  ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTokenManagement() {
  const { data, isLoading, isFetching, refetch } = useTokenCatalog();
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssetRow | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link: /admin/tokens?new=1 opens the Add Token dialog
  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setDialogOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const assets = data?.assets ?? [];
  const assetById = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const priceByMarket = React.useMemo(() => new Map((data?.prices ?? []).map((p) => [p.market_id, p])), [data]);

  const marketsForBase = (baseId: string) => (data?.markets ?? []).filter((m) => m.base_asset_id === baseId);

  const priceFor = (asset: AssetRow): { price: number | null; pair: string | null } => {
    const ms = marketsForBase(asset.id);
    const usdt = ms.find((m) => assetById.get(m.quote_asset_id)?.symbol === "USDT") ?? ms[0];
    if (usdt) {
      const p = priceByMarket.get(usdt.id);
      const quote = assetById.get(usdt.quote_asset_id)?.symbol ?? "?";
      return { price: p?.current_price ?? asset.initial_price ?? null, pair: `${asset.symbol}/${quote}` };
    }
    return { price: asset.initial_price ?? null, pair: null };
  };

  const q = search.trim().toLowerCase();
  const rows = assets.filter(
    (a) =>
      !q ||
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.network ?? "").toLowerCase().includes(q) ||
      (a.contract_address ?? "").toLowerCase().includes(q)
  );

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (a: AssetRow) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const activeCount = assets.filter((a) => a.is_active).length;
  const tradingCount = assets.filter((a) => a.is_active && a.trading_enabled).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-[hsl(240_10%_65%)]">
          <span>
            <strong className="text-[hsl(0_0%_98%)]">{assets.length}</strong> tokens
          </span>
          <span>·</span>
          <span>
            <strong className="text-[hsl(152_64%_55%)]">{activeCount}</strong> active
          </span>
          <span>·</span>
          <span>
            <strong className="text-[hsl(262_100%_75%)]">{tradingCount}</strong> tradable
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_10%_45%)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol, name, network…"
              className="pl-8 h-9 w-[240px] bg-[hsl(235_28%_12%)]"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Token
          </Button>
        </div>
      </div>

      {/* Table */}
      <CleanCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[hsl(235_20%_22%/0.4)] hover:bg-transparent">
                <TableHead className="w-[56px]">Icon</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Network</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[hsl(240_10%_60%)]">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading tokens…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[hsl(240_10%_60%)]">
                    <Coins className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No tokens match your search.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => {
                  const { price, pair } = priceFor(a);
                  return (
                    <TableRow
                      key={a.id}
                      className="border-[hsl(235_20%_22%/0.3)] cursor-pointer hover:bg-[hsl(235_28%_14%)]"
                      onClick={() => openEdit(a)}
                    >
                      <TableCell>
                        <CryptoLogo symbol={a.symbol} logoFilePath={a.logo_file_path} fallbackUrl={a.logo_url} size={32} />
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-[hsl(0_0%_98%)]">{a.symbol}</div>
                        <div className="text-xs text-[hsl(240_10%_60%)] truncate max-w-[180px]">{a.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[11px] border-[hsl(235_20%_30%)]">
                          {a.network || "—"}
                        </Badge>
                        {a.contract_address && (
                          <div className="text-[10px] font-mono text-[hsl(240_10%_50%)] mt-1">
                            {a.contract_address.slice(0, 6)}…{a.contract_address.slice(-4)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-[hsl(0_0%_98%)]">
                        {price != null ? `$${Number(price).toLocaleString(undefined, { maximumFractionDigits: 8 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-[hsl(240_10%_70%)]">{pair ?? <span className="text-[hsl(240_10%_45%)]">No market</span>}</TableCell>
                      <TableCell>
                        {a.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(152_64%_55%)]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(0_70%_65%)]">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Flag on={a.trading_enabled} label="Trade" />
                          <Flag on={a.show_in_portfolio} label="Portfolio" />
                          <Flag on={a.deposit_enabled} label="Deposit" />
                          <Flag on={a.withdraw_enabled} label="Withdraw" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${a.symbol}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(a);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CleanCard>

      <TokenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        assets={assets}
        markets={data?.markets ?? []}
      />
    </div>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded font-medium",
        on ? "bg-[hsl(152_64%_48%/0.15)] text-[hsl(152_64%_60%)]" : "bg-[hsl(235_20%_22%/0.4)] text-[hsl(240_10%_50%)] line-through"
      )}
    >
      {label}
    </span>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface TokenDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AssetRow | null;
  assets: AssetRow[];
  markets: MarketRow[];
}

function TokenDialog({ open, onOpenChange, editing, assets, markets }: TokenDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = React.useState<TokenForm>(emptyForm());
  const [isActive, setIsActive] = React.useState(true);

  const quoteCandidates = React.useMemo(() => {
    const preferred = ["USDT", "USDI", "BSK", "IPG", "BNB"];
    return assets
      .filter((a) => a.is_active && a.id !== editing?.id)
      .sort((a, b) => {
        const ia = preferred.indexOf(a.symbol);
        const ib = preferred.indexOf(b.symbol);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.symbol.localeCompare(b.symbol);
      });
  }, [assets, editing]);

  const usdtId = assets.find((a) => a.symbol === "USDT")?.id ?? "";

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      const existing = markets.find((m) => m.base_asset_id === editing.id);
      setForm({
        id: editing.id,
        name: editing.name,
        symbol: editing.symbol,
        network: editing.network ?? "BEP20",
        contract_address: editing.contract_address ?? "",
        decimals: String(editing.decimals ?? 18),
        logo_url: editing.logo_url ?? "",
        logo_file_path: editing.logo_file_path,
        initial_price: editing.initial_price != null ? String(editing.initial_price) : "",
        pair_quote_id: existing?.quote_asset_id ?? usdtId,
        trading_enabled: editing.trading_enabled,
        show_in_portfolio: editing.show_in_portfolio,
        deposit_enabled: editing.deposit_enabled,
        withdraw_enabled: editing.withdraw_enabled,
      });
      setIsActive(editing.is_active);
    } else {
      setForm({ ...emptyForm(), pair_quote_id: usdtId });
      setIsActive(true);
    }
  }, [open, editing, markets, usdtId]);

  const set = <K extends keyof TokenForm>(k: K, v: TokenForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const symbol = form.symbol.trim().toUpperCase();
      const name = form.name.trim();
      if (!symbol || !name) throw new Error("Name and symbol are required.");
      if (!/^[A-Z0-9 .-]{1,20}$/.test(symbol)) throw new Error("Symbol must be 1–20 letters/numbers.");
      const decimals = parseInt(form.decimals, 10);
      if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) throw new Error("Decimals must be between 0 and 36.");
      const price = form.initial_price.trim() === "" ? null : Number(form.initial_price);
      if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error("Initial price must be a positive number.");
      const contract = form.contract_address.trim();
      if (contract && !/^0x[a-fA-F0-9]{40}$/.test(contract) && /bep20|erc20|polygon|ethereum/i.test(form.network)) {
        throw new Error("Contract address must be a valid 0x… EVM address for this network.");
      }
      if (form.trading_enabled && !form.pair_quote_id) throw new Error("Select a quote asset for the trading pair.");

      const assetPayload = {
        name,
        symbol,
        network: form.network,
        contract_address: contract ? contract : null, // native assets must be NULL, never ""
        decimals,
        logo_url: form.logo_url.trim() || null,
        logo_file_path: form.logo_file_path,
        initial_price: price,
        price_currency: "USD",
        asset_type: "crypto",
        is_active: isActive,
        trading_enabled: form.trading_enabled,
        show_in_portfolio: form.show_in_portfolio,
        deposit_enabled: form.deposit_enabled,
        withdraw_enabled: form.withdraw_enabled,
      };

      let assetId = form.id;
      if (assetId) {
        const { error } = await supabase.from("assets").update(assetPayload).eq("id", assetId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("assets").insert(assetPayload).select("id").single();
        if (error) {
          if (error.code === "23505") throw new Error(`A token with symbol ${symbol} already exists.`);
          throw error;
        }
        assetId = data.id;
      }

      // Trading pair (markets + market_prices) so the token shows on the public trading page
      let pairSymbol: string | null = null;
      if (form.pair_quote_id) {
        const quote = assets.find((a) => a.id === form.pair_quote_id);
        pairSymbol = `${symbol}/${quote?.symbol ?? "?"}`;
        const existing = markets.find((m) => m.base_asset_id === assetId && m.quote_asset_id === form.pair_quote_id);
        const marketActive = isActive && form.trading_enabled;
        let marketId = existing?.id;
        if (existing) {
          const { error } = await supabase.from("markets").update({ is_active: marketActive }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("markets")
            .insert({
              base_asset_id: assetId,
              quote_asset_id: form.pair_quote_id,
              is_active: marketActive,
              tick_size: 0.0001,
              lot_size: 0.0001,
              min_notional: 1,
            })
            .select("id")
            .single();
          if (error) throw error;
          marketId = data.id;
        }
        // Seed / refresh the price row so the trading list has a real price immediately
        if (marketId && price != null) {
          const { data: existingPrice } = await supabase.from("market_prices").select("id").eq("market_id", marketId).maybeSingle();
          if (existingPrice) {
            if (!form.id) {
              await supabase.from("market_prices").update({ current_price: price, last_updated: new Date().toISOString() }).eq("id", existingPrice.id);
            }
          } else {
            const { error } = await supabase.from("market_prices").insert({
              market_id: marketId,
              symbol: pairSymbol,
              current_price: price,
              high_24h: price,
              low_24h: price,
              price_change_24h: 0,
              price_change_percentage_24h: 0,
              volume_24h: 0,
              last_updated: new Date().toISOString(),
            });
            if (error) throw error;
          }
        }
        // Other pairs for this base follow the trading toggle
        const others = markets.filter((m) => m.base_asset_id === assetId && m.quote_asset_id !== form.pair_quote_id);
        if (others.length && !marketActive) {
          await supabase.from("markets").update({ is_active: false }).in("id", others.map((m) => m.id));
        }
      }

      await supabase.rpc("log_admin_action" as any, {
        p_action: form.id ? "asset_updated" : "asset_created",
        p_resource_type: "asset",
        p_resource_id: assetId,
        p_new_values: { ...assetPayload, pair: pairSymbol },
      });

      return { symbol, pairSymbol, created: !form.id };
    },
    onSuccess: ({ symbol, pairSymbol, created }) => {
      invalidateTokenConsumers(qc);
      toast({
        title: created ? `${symbol} listed` : `${symbol} updated`,
        description: pairSymbol
          ? `${pairSymbol} is ${form.trading_enabled && isActive ? "now live on the trading page" : "saved (trading disabled)"}.`
          : "Token saved.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Could not save token", description: e?.message ?? String(e), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-[hsl(235_28%_11%)] border-[hsl(235_20%_22%/0.5)]">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.symbol}` : "Add Token"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply instantly to the trading page and user portfolios."
              : "New tokens appear on the public trading page and in user portfolios as soon as they're saved."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tether USD" />
          </Field>
          <Field label="Symbol" required>
            <Input
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value.toUpperCase())}
              placeholder="e.g. USDT"
              disabled={!!editing}
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Network" required>
            <Select value={form.network} onValueChange={(v) => set("network", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...NETWORKS, form.network].filter(Boolean))].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Decimals" required>
            <Input type="number" min={0} max={36} value={form.decimals} onChange={(e) => set("decimals", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Contract address" hint="Leave blank for native coins" className="sm:col-span-2">
            <Input
              value={form.contract_address}
              onChange={(e) => set("contract_address", e.target.value)}
              placeholder="0x…"
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Initial price (USD)" hint="Seeds the market price until live pricing updates">
            <Input
              type="number"
              min={0}
              step="any"
              value={form.initial_price}
              onChange={(e) => set("initial_price", e.target.value)}
              placeholder="0.00"
              className="font-mono"
            />
          </Field>
          <Field label="Trading pair (quote)" required={form.trading_enabled}>
            <Select value={form.pair_quote_id} onValueChange={(v) => set("pair_quote_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select quote asset" />
              </SelectTrigger>
              <SelectContent>
                {quoteCandidates.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {form.symbol || "TOKEN"}/{a.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Icon */}
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-[hsl(240_10%_65%)]">Icon</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
              <div className="space-y-2">
                <Input
                  value={form.logo_url}
                  onChange={(e) => set("logo_url", e.target.value)}
                  placeholder="https://… image URL (optional if uploading)"
                  className="text-xs"
                />
                <LogoUpload
                  assetSymbol={form.symbol || "TOKEN"}
                  currentLogo={form.logo_file_path}
                  onLogoUpdate={(p) => set("logo_file_path", p)}
                />
              </div>
              <div className="flex flex-col items-center gap-1 pt-1">
                <CryptoLogo symbol={form.symbol || "?"} logoFilePath={form.logo_file_path} fallbackUrl={form.logo_url || null} size={48} />
                <span className="text-[10px] text-[hsl(240_10%_55%)]">Preview</span>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Toggle label="Enable Trading" desc="List the pair on the public trading page" checked={form.trading_enabled} onChange={(v) => set("trading_enabled", v)} />
            <Toggle label="Show in Portfolio" desc="Display in user wallet balances" checked={form.show_in_portfolio} onChange={(v) => set("show_in_portfolio", v)} />
            <Toggle label="Enable Deposits" desc="Allow users to deposit this token" checked={form.deposit_enabled} onChange={(v) => set("deposit_enabled", v)} />
            <Toggle label="Enable Withdrawals" desc="Allow users to withdraw this token" checked={form.withdraw_enabled} onChange={(v) => set("withdraw_enabled", v)} />
            {editing && (
              <Toggle
                label="Token active"
                desc="Inactive tokens are hidden everywhere"
                checked={isActive}
                onChange={setIsActive}
                className="sm:col-span-2 border-[hsl(38_92%_55%/0.35)]"
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add Token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wide text-[hsl(240_10%_65%)]">
        {label}
        {required && <span className="text-[hsl(0_70%_65%)] ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-[hsl(240_10%_50%)]">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  className,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border border-[hsl(235_20%_22%/0.5)] bg-[hsl(235_28%_13%)] cursor-pointer",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[hsl(0_0%_96%)]">{label}</p>
        <p className="text-[11px] text-[hsl(240_10%_58%)]">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
