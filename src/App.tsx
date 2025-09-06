import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProviderUser } from "@/hooks/useAuthUser";
import { AuthProviderAdmin } from "@/hooks/useAuthAdmin";
import { Web3Provider } from "@/contexts/Web3Context";

// Layouts
import UserLayout from "@/layouts/UserLayout";
import AdminLayout from "@/layouts/AdminLayout";

// Guards
import UserRoute from "@/components/UserRoute";
import AdminRouteNew from "@/components/AdminRouteNew";

// Landing & Auth Pages
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import WelcomeScreen1 from "./pages/WelcomeScreen1";
import WelcomeScreen2 from "./pages/WelcomeScreen2";
import WelcomeScreen3 from "./pages/WelcomeScreen3";
import AuthLoginScreen from "./pages/AuthLoginScreen";
import AuthRegisterScreen from "./pages/AuthRegisterScreen";
import AppLockScreen from "./pages/AppLockScreen";

// Onboarding Pages
import OnboardingIndexScreen from "./pages/OnboardingIndexScreen";
import WalletSelectionScreen from "./pages/WalletSelectionScreen";
import CreateWalletScreen from "./pages/CreateWalletScreen";
import ImportWalletScreen from "./pages/ImportWalletScreen";
import SecuritySetupScreen from "./pages/SecuritySetupScreen";

// User App Pages
import AppHomeScreen from "./pages/AppHomeScreen";
import WalletHomeScreen from "./pages/WalletHomeScreen";
import DepositScreen from "./pages/DepositScreen";
import WithdrawScreen from "./pages/WithdrawScreen";
import SendScreen from "./pages/SendScreen";
import TransferScreen from "./pages/TransferScreen";
import MarketsScreen from "./pages/MarketsScreen";
import MarketDetailScreen from "./pages/MarketDetailScreen";
import TradingScreen from "./pages/TradingScreen";
import TradeReceiptScreen from "./pages/TradeReceiptScreen";
import OrderConfirmationScreen from "./pages/OrderConfirmationScreen";
import SwapScreen from "./pages/SwapScreen";
import ProgramsScreen from "./pages/ProgramsScreen";
import SubscriptionsScreen from "./pages/SubscriptionsScreen";
import ReferralsScreen from "./pages/ReferralsScreen";
import StakingScreen from "./pages/StakingScreen";
import StakingDetailScreen from "./pages/StakingDetailScreen";
import LuckyDrawScreen from "./pages/LuckyDrawScreen";
import InsuranceScreen from "./pages/InsuranceScreen";
import FileClaimScreen from "./pages/FileClaimScreen";
import HistoryScreen from "./pages/HistoryScreen";
import INRDepositScreen from "./pages/INRDepositScreen";
import ProfileScreen from "./pages/ProfileScreen";

// Admin Pages
import AdminLoginScreen from "./pages/AdminLoginScreen";
import AdminPanel from "./pages/AdminPanel";

// Utility Pages
import EmailVerificationScreen from "./pages/EmailVerificationScreen";
import EmailVerifiedScreen from "./pages/EmailVerifiedScreen";
import ResetPasswordScreen from "./pages/ResetPasswordScreen";
import DebugCatalogScreen from "./pages/DebugCatalogScreen";
import { SupportScreen } from "@/pages/SupportScreen";
import { SupportTicketScreen } from "@/pages/SupportTicketScreen";
import { AdminSupportScreen } from "@/pages/AdminSupportScreen";
import { AdminSupportTicketScreen } from "@/pages/AdminSupportTicketScreen";
import { AdminNotificationsScreen } from "@/pages/AdminNotificationsScreen";
import { NotificationsScreen } from "@/pages/NotificationsScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing & Splash */}
              <Route path="/" element={<Navigate to="/splash" replace />} />
              <Route path="/splash" element={<SplashScreen />} />
              <Route path="/welcome" element={<WelcomeScreen />} />
              <Route path="/welcome-1" element={<WelcomeScreen1 />} />
              <Route path="/welcome-2" element={<WelcomeScreen2 />} />
              <Route path="/welcome-3" element={<WelcomeScreen3 />} />

              {/* Onboarding Flow */}
              <Route path="/onboarding" element={<OnboardingIndexScreen />} />
              <Route path="/onboarding/create-wallet" element={<CreateWalletScreen />} />
              <Route path="/onboarding/import-wallet" element={<ImportWalletScreen />} />
              <Route path="/onboarding/security" element={<SecuritySetupScreen />} />
              <Route path="/wallet-selection" element={<WalletSelectionScreen />} />

              {/* Legacy Onboarding Redirects */}
              <Route path="/create-wallet" element={<Navigate to="/onboarding/create-wallet" replace />} />
              <Route path="/import-wallet" element={<Navigate to="/onboarding/import-wallet" replace />} />

              {/* User Authentication */}
              <Route path="/auth/login" element={
                <AuthProviderUser>
                  <AuthLoginScreen />
                </AuthProviderUser>
              } />
              <Route path="/auth/register" element={
                <AuthProviderUser>
                  <AuthRegisterScreen />
                </AuthProviderUser>
              } />
              <Route path="/auth/lock" element={<AppLockScreen />} />

              {/* User App Routes */}
              <Route path="/app/*" element={
                <AuthProviderUser>
                  <UserRoute>
                    <UserLayout />
                  </UserRoute>
                </AuthProviderUser>
              }>
                <Route index element={<Navigate to="/app/home" replace />} />
                <Route path="home" element={<AppHomeScreen />} />
                <Route path="wallet" element={<WalletHomeScreen />} />
                <Route path="wallet/deposit" element={<DepositScreen />} />
                <Route path="wallet/withdraw" element={<WithdrawScreen />} />
                <Route path="wallet/send" element={<SendScreen />} />
                <Route path="wallet/transfer" element={<TransferScreen />} />
                <Route path="wallet/history" element={<HistoryScreen />} />
                <Route path="markets" element={<MarketsScreen />} />
                <Route path="markets/:pair" element={<MarketDetailScreen />} />
                <Route path="trade" element={<TradingScreen />} />
                <Route path="trade/receipt" element={<TradeReceiptScreen />} />
                <Route path="trade/confirmation" element={<OrderConfirmationScreen />} />
                <Route path="swap" element={<SwapScreen />} />
                <Route path="programs" element={<ProgramsScreen />} />
                <Route path="programs/subscriptions" element={<SubscriptionsScreen />} />
                <Route path="programs/referrals" element={<ReferralsScreen />} />
                <Route path="programs/staking" element={<StakingScreen />} />
                <Route path="programs/staking/:id" element={<StakingDetailScreen />} />
                <Route path="programs/lucky" element={<LuckyDrawScreen />} />
                <Route path="programs/insurance" element={<InsuranceScreen />} />
                <Route path="programs/insurance/claim" element={<FileClaimScreen />} />
                <Route path="deposit/inr" element={<INRDepositScreen />} />
                <Route path="profile" element={<ProfileScreen />} />
                <Route path="support" element={<SupportScreen />} />
                <Route path="support/t/:id" element={<SupportTicketScreen />} />
                <Route path="notifications" element={<NotificationsScreen />} />
              </Route>

              {/* Admin Authentication */}
              <Route path="/admin/login" element={
                <AuthProviderAdmin>
                  <AdminLoginScreen />
                </AuthProviderAdmin>
              } />

              {/* Admin Console Routes */}
              <Route path="/admin/*" element={
                <AuthProviderAdmin>
                  <AdminRouteNew>
                    <AdminLayout />
                  </AdminRouteNew>
                </AuthProviderAdmin>
              }>
                <Route index element={<AdminPanel />} />
                <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-bold">User Management</h1></div>} />
                <Route path="assets" element={<div className="p-6"><h1 className="text-2xl font-bold">Asset Management</h1></div>} />
                <Route path="markets" element={<div className="p-6"><h1 className="text-2xl font-bold">Market Management</h1></div>} />
                <Route path="funding" element={<div className="p-6"><h1 className="text-2xl font-bold">Funding Management</h1></div>} />
                <Route path="subscriptions" element={<div className="p-6"><h1 className="text-2xl font-bold">Subscription Management</h1></div>} />
                <Route path="referrals" element={<div className="p-6"><h1 className="text-2xl font-bold">Referral Management</h1></div>} />
                <Route path="staking" element={<div className="p-6"><h1 className="text-2xl font-bold">Staking Management</h1></div>} />
                <Route path="lucky" element={<div className="p-6"><h1 className="text-2xl font-bold">Lucky Draw Management</h1></div>} />
                <Route path="insurance" element={<div className="p-6"><h1 className="text-2xl font-bold">Insurance Management</h1></div>} />
                <Route path="ads" element={<div className="p-6"><h1 className="text-2xl font-bold">Ads Management</h1></div>} />
                <Route path="fees" element={<div className="p-6"><h1 className="text-2xl font-bold">Fee Management</h1></div>} />
                <Route path="transfers" element={<div className="p-6"><h1 className="text-2xl font-bold">Transfer Management</h1></div>} />
                <Route path="compliance" element={<div className="p-6"><h1 className="text-2xl font-bold">Compliance</h1></div>} />
                <Route path="reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Reports</h1></div>} />
                <Route path="support" element={<AdminSupportScreen />} />
                <Route path="support/t/:id" element={<AdminSupportTicketScreen />} />
                <Route path="notifications" element={<AdminNotificationsScreen />} />
                <Route path="system" element={<div className="p-6"><h1 className="text-2xl font-bold">System Settings</h1></div>} />
              </Route>

              {/* Utility Routes */}
              <Route path="/email-verification" element={<EmailVerificationScreen />} />
              <Route path="/email-verified" element={<EmailVerifiedScreen />} />
              <Route path="/reset-password" element={<ResetPasswordScreen />} />
              <Route path="/debug/catalog" element={<DebugCatalogScreen />} />

              {/* Legacy auth route redirect */}
              <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

              {/* Legacy user path redirects for deep links */}
              <Route path="/wallet-home" element={<Navigate to="/app/wallet" replace />} />
              <Route path="/wallet" element={<Navigate to="/app/wallet" replace />} />
              <Route path="/deposit" element={<Navigate to="/app/wallet/deposit" replace />} />
              <Route path="/withdraw" element={<Navigate to="/app/wallet/withdraw" replace />} />
              <Route path="/send" element={<Navigate to="/app/wallet/send" replace />} />
              <Route path="/transfer" element={<Navigate to="/app/wallet/transfer" replace />} />
              <Route path="/history" element={<Navigate to="/app/wallet/history" replace />} />
              <Route path="/markets" element={<Navigate to="/app/markets" replace />} />
              <Route path="/trading" element={<Navigate to="/app/trade" replace />} />
              <Route path="/swap" element={<Navigate to="/app/swap" replace />} />
              <Route path="/programs" element={<Navigate to="/app/programs" replace />} />
              <Route path="/staking" element={<Navigate to="/app/programs/staking" replace />} />
              <Route path="/referrals" element={<Navigate to="/app/programs/referrals" replace />} />
              <Route path="/subscriptions" element={<Navigate to="/app/programs/subscriptions" replace />} />
              <Route path="/insurance" element={<Navigate to="/app/programs/insurance" replace />} />
              <Route path="/lucky-draw" element={<Navigate to="/app/programs/lucky" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;