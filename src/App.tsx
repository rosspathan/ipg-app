import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import WelcomeScreen1 from "./pages/WelcomeScreen1";
import WelcomeScreen2 from "./pages/WelcomeScreen2";
import WelcomeScreen3 from "./pages/WelcomeScreen3";
import WalletSelectionScreen from "./pages/WalletSelectionScreen";
import CreateWalletScreen from "./pages/CreateWalletScreen";
import ImportWalletScreen from "./pages/ImportWalletScreen";
import SecuritySetupScreen from "./pages/SecuritySetupScreen";
import AppLockScreen from "./pages/AppLockScreen";
import WalletHomeScreen from "./pages/WalletHomeScreen";
import DepositScreen from "./pages/DepositScreen";
import WithdrawScreen from "./pages/WithdrawScreen";
import SendScreen from "./pages/SendScreen";
import TransferScreen from "./pages/TransferScreen";
import HistoryScreen from "./pages/HistoryScreen";
import MarketsScreen from "./pages/MarketsScreen";
import MarketDetailScreen from "./pages/MarketDetailScreen";
import TradingScreen from "./pages/TradingScreen";
import OrderConfirmationScreen from "./pages/OrderConfirmationScreen";
import TradeReceiptScreen from "./pages/TradeReceiptScreen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/welcome" element={<WelcomeScreen1 />} />
          <Route path="/welcome-2" element={<WelcomeScreen2 />} />
          <Route path="/welcome-3" element={<WelcomeScreen3 />} />
          <Route path="/wallet-selection" element={<WalletSelectionScreen />} />
          <Route path="/create-wallet" element={<CreateWalletScreen />} />
          <Route path="/import-wallet" element={<ImportWalletScreen />} />
          <Route path="/security-setup" element={<SecuritySetupScreen />} />
          <Route path="/app-lock" element={<AppLockScreen />} />
          <Route path="/wallet-home" element={<WalletHomeScreen />} />
          <Route path="/deposit" element={<DepositScreen />} />
          <Route path="/withdraw" element={<WithdrawScreen />} />
          <Route path="/send" element={<SendScreen />} />
          <Route path="/transfer" element={<TransferScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/markets" element={<MarketsScreen />} />
          <Route path="/market-detail/:pair" element={<MarketDetailScreen />} />
          <Route path="/trading/:pair" element={<TradingScreen />} />
          <Route path="/order-confirmation" element={<OrderConfirmationScreen />} />
          <Route path="/trade-receipt" element={<TradeReceiptScreen />} />
          <Route path="/dashboard" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
