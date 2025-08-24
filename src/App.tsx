import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Web3Provider } from "@/contexts/Web3Context";
import AdminRoute from "@/components/AdminRoute";
import AuthScreen from "./pages/AuthScreen";
import Index from "./pages/Index";
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import WelcomeScreen1 from "./pages/WelcomeScreen1";
import WelcomeScreen2 from "./pages/WelcomeScreen2";
import WelcomeScreen3 from "./pages/WelcomeScreen3";
import WalletSelectionScreen from "./pages/WalletSelectionScreen";
import CreateWalletScreen from "./pages/CreateWalletScreen";
import ImportWalletScreen from "./pages/ImportWalletScreen";
import SecuritySetupScreen from "./pages/SecuritySetupScreen";
import DepositScreen from "./pages/DepositScreen";
import WithdrawScreen from "./pages/WithdrawScreen";
import SendScreen from "./pages/SendScreen";
import TransferScreen from "./pages/TransferScreen";
import TradingScreen from "./pages/TradingScreen";
import TradeReceiptScreen from "./pages/TradeReceiptScreen";
import OrderConfirmationScreen from "./pages/OrderConfirmationScreen";
import MarketsScreen from "./pages/MarketsScreen";
import MarketDetailScreen from "./pages/MarketDetailScreen";
import HistoryScreen from "./pages/HistoryScreen";
import ProgramsScreen from "./pages/ProgramsScreen";
import SubscriptionsScreen from "./pages/SubscriptionsScreen";
import ReferralsScreen from "./pages/ReferralsScreen";
import StakingScreen from "./pages/StakingScreen";
import StakingDetailScreen from "./pages/StakingDetailScreen";
import LuckyDrawScreen from "./pages/LuckyDrawScreen";
import InsuranceScreen from "./pages/InsuranceScreen";
import FileClaimScreen from "./pages/FileClaimScreen";
import AppLockScreen from "./pages/AppLockScreen";
import WalletHomeScreen from "./pages/WalletHomeScreen";
import EmailVerificationScreen from "./pages/EmailVerificationScreen";
import EmailVerifiedScreen from "./pages/EmailVerifiedScreen";
import AdminPanel from "./pages/AdminPanel";
import AdminLoginScreen from "./pages/AdminLoginScreen";
import NotFound from "./pages/NotFound";
import ResetPasswordScreen from "./pages/ResetPasswordScreen";
import DebugCatalog from "./pages/DebugCatalog";
import TestUsers from "./pages/TestUsers";
 
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Web3Provider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
               <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route path="/admin-login" element={<AdminLoginScreen />} />
               <Route path="/splash" element={<SplashScreen />} />
               <Route path="/welcome" element={<WelcomeScreen />} />
               <Route path="/welcome1" element={<WelcomeScreen1 />} />
               <Route path="/welcome2" element={<WelcomeScreen2 />} />
               <Route path="/welcome3" element={<WelcomeScreen3 />} />
               <Route path="/wallet-selection" element={<WalletSelectionScreen />} />
               <Route path="/create-wallet" element={<CreateWalletScreen />} />
                 <Route path="/import-wallet" element={<ImportWalletScreen />} />
                 <Route path="/email-verification" element={<EmailVerificationScreen />} />
                 <Route path="/email-verified" element={<EmailVerifiedScreen />} />
                 <Route path="/security-setup" element={<SecuritySetupScreen />} />
               <Route path="/deposit" element={<DepositScreen />} />
               <Route path="/withdraw" element={<WithdrawScreen />} />
               <Route path="/send" element={<SendScreen />} />
               <Route path="/transfer" element={<TransferScreen />} />
               <Route path="/trading" element={<TradingScreen />} />
               <Route path="/trade-receipt" element={<TradeReceiptScreen />} />
               <Route path="/order-confirmation" element={<OrderConfirmationScreen />} />
               <Route path="/markets" element={<MarketsScreen />} />
               <Route path="/market-detail" element={<MarketDetailScreen />} />
               <Route path="/history" element={<HistoryScreen />} />
               <Route path="/programs" element={<ProgramsScreen />} />
               <Route path="/subscriptions" element={<SubscriptionsScreen />} />
               <Route path="/referrals" element={<ReferralsScreen />} />
               <Route path="/staking" element={<StakingScreen />} />
               <Route path="/staking-detail" element={<StakingDetailScreen />} />
               <Route path="/lucky-draw" element={<LuckyDrawScreen />} />
               <Route path="/insurance" element={<InsuranceScreen />} />
               <Route path="/file-claim" element={<FileClaimScreen />} />
               <Route path="/app-lock" element={<AppLockScreen />} />
                <Route path="/wallet-home" element={<WalletHomeScreen />} />
        <Route path="/debug/catalog" element={<DebugCatalog />} />
        <Route path="/test-users" element={<TestUsers />} />
                 <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                 <Route path="/admin/*" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </Web3Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;