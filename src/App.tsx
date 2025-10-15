import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/styles/scroll-fix.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import { AuthProviderUser } from "@/hooks/useAuthUser";
import { AuthProviderAdmin } from "@/hooks/useAuthAdmin";
import { Web3Provider } from "@/contexts/Web3Context";
import { UnlockGate } from "@/components/UnlockGate";
import { useSecuritySync } from "@/hooks/useSecuritySync";
import { RouterWrapper } from "@/components/RouterWrapper";
import { AppInitializer } from "@/components/AppInitializer";
import { AppStateManager } from "@/components/AppStateManager";

// Layouts
import UserLayout from "@/layouts/UserLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AdminLayoutClean from "@/layouts/AdminLayoutClean";
import { AdminShellAdaptive } from "@/components/admin/nova/AdminShellAdaptive";

// Clean Admin Pages
import AdminDashboardClean from "./pages/admin/AdminDashboardClean";
import AdminUsersClean from "./pages/admin/AdminUsersClean";
import AdminProgramsClean from "./pages/admin/AdminProgramsClean";
import AdminSettingsClean from "./pages/admin/AdminSettingsClean";
// Nova Admin Pages
import AdminDashboardNova from "./pages/admin/AdminDashboardNova";
import AdminUsersNova from "./pages/admin/AdminUsersNova";
import AdminMarketsNova from "./pages/admin/AdminMarketsNova";
import AdminTradingOrders from "./pages/admin/AdminTradingOrders";
import AdminTradingEngine from "./pages/admin/AdminTradingEngine";
import AdminSubscriptionsNova from "./pages/admin/AdminSubscriptionsNova";
import AdminStakingNova from "./pages/admin/AdminStakingNova";
import AdminSpinNova from "./pages/admin/AdminSpinNova";
import AdminReportsNova from "./pages/admin/AdminReportsNova";
import AdminSettingsNova from "./pages/admin/AdminSettingsNova";

// CMS Program Registry
const AdminProgramsNova = React.lazy(() => import("./pages/admin/AdminProgramsNova"));
const AdminProgramEditorNova = React.lazy(() => import("./pages/admin/AdminProgramEditorNova"));
const AdminProgramEditorClean = React.lazy(() => import("./pages/admin/AdminProgramEditorClean"));
const AdminProgramsControl = React.lazy(() => import("./pages/admin/AdminProgramsControl"));
const AdMiningControlPanel = React.lazy(() => import("./pages/admin/program-controls/AdMiningControlPanel"));
const LuckyDrawControlPanel = React.lazy(() => import("./pages/admin/program-controls/LuckyDrawControlPanel"));
const SpinWheelControlPanel = React.lazy(() => import("./pages/admin/program-controls/SpinWheelControlPanel"));
const AdminProgramAnalytics = React.lazy(() => import("./pages/admin/AdminProgramAnalytics"));
const ProgramControlCenter = React.lazy(() => import("./pages/admin/ProgramControlCenter"));
const ProgramTemplates = React.lazy(() => import("./pages/admin/ProgramTemplates"));
const ProgramsHub = React.lazy(() => import("./pages/ProgramsHub"));
const ProgramDetail = React.lazy(() => import("./pages/ProgramDetail"));
const ProgramParticipate = React.lazy(() => import("./pages/ProgramParticipate"));
const AdminSystemHealth = React.lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminUsersManagementNova = React.lazy(() => import("./pages/admin/AdminUsersManagementNova"));
const AdminMobileLinking = React.lazy(() => import("./pages/admin/AdminMobileLinking"));
import AdminBSKManagementNova from "./pages/admin/AdminBSKManagementNova";
import AdminBSKLoansNova from "./pages/admin/AdminBSKLoansNova";
import AdminManualPurchasesScreen from "./pages/AdminManualPurchasesScreen";
import ManualBSKPurchaseScreen from "./pages/ManualBSKPurchaseScreen";
import AdminCryptoConversionsScreen from "./pages/AdminCryptoConversionsScreen";
import AdminAnnouncementsScreen from "./pages/AdminAnnouncementsScreen";
import BSKTransferScreen from "./pages/BSKTransferScreen";
import AdminKYCReview from "./pages/AdminKYCReview";
const KYCReviewNew = React.lazy(() => import("./pages/admin/KYCReviewNew"));
const AdminKYCSettings = React.lazy(() => import("./pages/AdminKYCSettings"));

// Guards
import UserRoute from "@/components/UserRoute";
import AdminRouteNew from "@/components/AdminRouteNew";

// Landing & Auth Pages
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import WelcomeScreen1 from "./pages/WelcomeScreen1";
import WelcomeScreen2 from "./pages/WelcomeScreen2";
import WelcomeScreen3 from "./pages/WelcomeScreen3";
import AuthUnified from "./pages/AuthUnified";
import AuthEmailVerification from "./pages/AuthEmailVerification";
import AuthCallback from "./pages/AuthCallback";
import AppLockScreen from "./pages/AppLockScreen";
import LockScreen from "./pages/lock/LockScreen";
import { AppLockGuard } from "@/components/AppLockGuard";
import WalletLoginScreen from "./pages/WalletLoginScreen";

// Onboarding Pages
import OnboardingFlow from "./pages/OnboardingFlow";
import OnboardingIndexScreen from "./pages/OnboardingIndexScreen";
import WalletSelectionScreen from "./pages/WalletSelectionScreen";
import CreateWalletScreen from "./pages/CreateWalletScreen";
import ImportWalletScreen from "./pages/ImportWalletScreen";
import SecuritySetupScreen from "./pages/SecuritySetupScreen";
import RecoveryVerifyScreen from "./pages/RecoveryVerifyScreen";

// User App Pages
import AppHomeScreen from "./pages/AppHomeScreen";
import ProgramsListPage from "./pages/ProgramsListPage";
import ProgramDetailPage from "./pages/ProgramDetailPage";
import WalletHomeScreen from "./pages/WalletHomeScreen";
import DepositScreen from "./pages/DepositScreen";
import WithdrawScreen from "./pages/WithdrawScreen";
import SendScreen from "./pages/SendScreen";
import TransferScreen from "./pages/TransferScreen";
import MarketsScreen from "./pages/MarketsScreen";
import MarketDetailScreen from "./pages/MarketDetailScreen";
import TradingScreenRebuilt from "./pages/TradingScreenRebuilt";
import TradeReceiptScreen from "./pages/TradeReceiptScreen";
import OrderConfirmationScreen from "./pages/OrderConfirmationScreen";
import SwapScreen from "./pages/SwapScreen";
import ProgramsScreen from "./pages/ProgramsScreen";
import SubscriptionsScreen from "./pages/SubscriptionsScreen";
import ReferralsScreen from "./pages/ReferralsScreen";
import BadgeSubscriptionScreen from "./pages/BadgeSubscriptionScreen";
import StakingScreen from "./pages/StakingScreen";
import StakingDetailScreen from "./pages/StakingDetailScreen";
import StakingSubmissionScreen from "./pages/StakingSubmissionScreen";
import NewLuckyDraw from "./components/NewLuckyDraw";
import BSKWithdrawScreen from "@/pages/BSKWithdrawScreen";
import AdminBSKWithdrawalsScreen from "@/pages/AdminBSKWithdrawalsScreen";
import CryptoConversionScreen from "./pages/CryptoConversionScreen";

import SpinHistoryScreen from "./pages/SpinHistoryScreen";
import AdvertisingMiningScreen from "./pages/AdvertisingMiningScreen";
import BSKPromotionScreen from "./pages/BSKPromotionScreen";
import { AdminAdsScreen } from "./pages/AdminAdsScreen";
import InsuranceScreen from "./components/InsuranceScreen";
import BSKLoansScreen from "./pages/BSKLoansScreen";
import FileClaimScreen from "./pages/FileClaimScreen";
import HistoryScreen from "./pages/HistoryScreen";
import GamificationScreen from "./pages/GamificationScreen";
import INRDepositScreen from "./pages/INRDepositScreen";
import INRWithdrawScreen from "./pages/INRWithdrawScreen";
import ProfileScreen from "./pages/ProfileScreen";

// New Program Pages
const AdvertisingPage = React.lazy(() => import("./pages/programs/AdvertisingPage"));
const LuckyDrawPageOld = React.lazy(() => import("./pages/programs/LuckyDrawPage"));
const StakingPageNew = React.lazy(() => import("./pages/programs/StakingPage"));
const SpinWheelPage = React.lazy(() => import("./pages/programs/SpinWheelPage"));
const ReferralsPageNew = React.lazy(() => import("./pages/programs/ReferralsPage"));
const LoansPageNew = React.lazy(() => import("./pages/programs/LoansPage"));
const InsurancePageNew = React.lazy(() => import("./pages/programs/InsurancePage"));
const PurchasePage = React.lazy(() => import("./pages/programs/PurchasePage"));

// Admin Pages
import AdminLoginScreen from "./pages/AdminLoginScreen";
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminDatabaseReset = React.lazy(() => import("./pages/AdminDatabaseReset"));
import AdminUsers from "./pages/AdminUsers";
import AdminAssets from "./pages/AdminAssets";
import AdminMarkets from "./pages/AdminMarkets";
import AdminMarketFeedScreen from "./pages/AdminMarketFeedScreen";
import AdminFunding from "./pages/AdminFunding";
import { AdminSubscriptions } from "./components/AdminSubscriptions";
import AdminReferralProgram from "./pages/AdminReferralProgram";
import AdminTeamReferralsScreen from "./pages/AdminTeamReferralsScreen";
import { AdminStaking } from "./components/AdminStaking";
import AdminNewLuckyDraw from "./components/AdminNewLuckyDraw";
import AdminInsurance from "./components/AdminInsurance";
import { AdminAds } from "./components/AdminAds";
import { AdminFees } from "./components/AdminFees";
import { AdminTradingFeesSimple } from "./components/AdminTradingFeesSimple";
import AdminPurchaseBonusScreen from "./pages/AdminPurchaseBonusScreen";
import AdminINRFundingScreen from "./pages/AdminINRFundingScreen";
import AdminCredentialsTest from "./pages/AdminCredentialsTest";
import AdminSystemScreen from "./pages/AdminSystemScreen";
import CurrencyControlCenter from "./pages/admin/CurrencyControlCenter";
import TransactionControlCenter from "./pages/admin/TransactionControlCenter";
import UserFinancialManagement from "./pages/admin/UserFinancialManagement";
import FinancialReports from "./pages/admin/FinancialReports";
import FinancialAnalytics from "./pages/admin/FinancialAnalytics";

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
import NotFound from "@/pages/NotFound";
import RemovedPage from "@/pages/RemovedPage";
import DebugFunding from "@/pages/DebugFunding";
import SpinVerifyScreen from "@/pages/SpinVerifyScreen"; 
import BSKVestingScreen from "@/pages/BSKVestingScreen";
import { BSKWalletPage } from "@/pages/astra/BSKWalletPage";
import { WalletPage } from "@/pages/astra/WalletPage";

import { AstraLayout } from "@/layouts/AstraLayout";
import { HomePageRebuilt } from "@/pages/astra/HomePageRebuilt";
import { ProgramsPageRebuilt } from "@/pages/astra/ProgramsPageRebuilt";
import { ProgramsPagePro } from "@/pages/astra/ProgramsPagePro";
import { TradingOverview } from "@/pages/astra/TradingOverview";
import { TradingPairPage } from "@/pages/astra/TradingPairPage";
import { ProfileHub } from "@/pages/ProfileHub";
import { KYCPage } from "@/pages/KYCPage";
import KYCSubmission from "@/pages/KYCSubmission";
import { IDCardPage } from "@/pages/IDCardPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ReferralsPage } from "@/pages/ReferralsPage";

import { DownloadPage } from "@/pages/DownloadPage";
import { DeepLinkResolver } from "@/pages/DeepLinkResolver";
import { InsurancePage } from "@/pages/astra/InsurancePage";
import { AdvertiseMiningPage } from "@/pages/astra/AdvertiseMiningPage";
import DesignReview from "@/pages/astra/DesignReview";
import { SupportPage } from "@/pages/SupportPage";

// Phase 3 & 4 User Programs
const ReferralsPageAstra = React.lazy(() => import("./pages/astra/ReferralsPage"));
const AdMiningPageNew = React.lazy(() => import("./pages/programs/AdMiningPageNew"));
const LuckyDrawPageNew = React.lazy(() => import("./pages/programs/LuckyDrawPageNew"));
const LoansPage = React.lazy(() => import("./pages/astra/LoansPage"));

// ✅ V3 Spin Wheel with SpinWheel3D (4 segments, premium design)
const ISmartSpinScreen = React.lazy(() => import("@/pages/ISmartSpinScreen"));

const queryClient = new QueryClient();

function App() {
  // Initialize security sync hook
  useSecuritySync();
  
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppStateManager />
            <RouterWrapper>
              <Routes>
              {/* Landing & Splash */}
              <Route path="/" element={<AppInitializer><Navigate to="/onboarding" replace /></AppInitializer>} />
              <Route path="/splash" element={<SplashScreen />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/deeplink/r/:code" element={<DeepLinkResolver />} />
              <Route path="/welcome" element={<WelcomeScreen />} />
              <Route path="/welcome-1" element={<WelcomeScreen1 />} />
              <Route path="/welcome-2" element={<WelcomeScreen2 />} />
              <Route path="/welcome-3" element={<WelcomeScreen3 />} />

              {/* Onboarding Flow */}
              <Route path="/onboarding" element={<OnboardingFlow />} />
              <Route path="/onboarding/create-wallet" element={<CreateWalletScreen />} />
              <Route path="/onboarding/import-wallet" element={<ImportWalletScreen />} />
              <Route path="/onboarding/security" element={<SecuritySetupScreen />} />
              <Route path="/recovery/verify" element={<RecoveryVerifyScreen />} />
              <Route path="/wallet-selection" element={<WalletSelectionScreen />} />

              {/* Legacy Onboarding Redirects */}
              <Route path="/create-wallet" element={<Navigate to="/onboarding/create-wallet" replace />} />
              <Route path="/import-wallet" element={<Navigate to="/onboarding/import-wallet" replace />} />

              {/* User Authentication */}
              <Route path="/auth" element={
                <AuthProviderUser>
                  <AuthUnified />
                </AuthProviderUser>
              } />
              <Route path="/auth/login" element={
                <AuthProviderUser>
                  <AuthUnified />
                </AuthProviderUser>
              } />
              <Route path="/auth/wallet-login" element={<WalletLoginScreen />} />
              <Route path="/auth/register" element={
                <AuthProviderUser>
                  <AuthUnified />
                </AuthProviderUser>
              } />
              <Route path="/auth/email-verification" element={
                <AuthProviderUser>
                  <AuthEmailVerification />
                </AuthProviderUser>
              } />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/lock" element={<AppLockScreen />} />
              
              {/* Lock Flow - Returning users only */}
              <Route path="/lock" element={<LockScreen />} />

              {/* Legacy User App removed */}
              <Route path="/app-legacy/*" element={<RemovedPage home="/app/home" removed="Legacy user routes have been removed." />} />

              {/* User App Routes - New Astra Design System */}
              <Route path="/app/*" element={
                <AuthProviderUser>
                  <UserRoute>
                    <AppLockGuard>
                      <UnlockGate>
                        <AstraLayout />
                      </UnlockGate>
                    </AppLockGuard>
                  </UserRoute>
                </AuthProviderUser>
              }>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<HomePageRebuilt />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="wallet/deposit" element={<DepositScreen />} />
              <Route path="wallet/withdraw" element={<WithdrawScreen />} />
              <Route path="wallet/send" element={<SendScreen />} />
              <Route path="wallet/transfer" element={<TransferScreen />} />
              <Route path="wallet/history" element={<HistoryScreen />} />
              <Route path="programs" element={<ProgramsListPage />} />
              <Route path="programs/:programKey" element={<ProgramDetailPage />} />
              <Route path="trade" element={<TradingOverview />} />
              <Route path="trade/:symbol" element={<TradingPairPage />} />
              <Route path="trading" element={<Navigate to="/app/trade" replace />} />
              <Route path="swap" element={<SwapScreen />} />
              
              {/* Profile Hub */}
              <Route path="profile" element={<ProfileHub />} />
              <Route path="profile/kyc" element={<KYCSubmission />} />
              <Route path="profile/id-card" element={<IDCardPage />} />
              <Route path="profile/security" element={<SecurityPage />} />
              <Route path="profile/notify" element={<NotificationsPage />} />
              <Route path="profile/settings" element={<SettingsPage />} />
              <Route path="profile/referrals" element={<React.Suspense fallback={<div>Loading...</div>}><ReferralsPageAstra /></React.Suspense>} />
              <Route path="support" element={<SupportPage />} />
                
                {/* Programs */}
                <Route path="programs/ad-mining" element={<React.Suspense fallback={<div>Loading...</div>}><AdMiningPageNew /></React.Suspense>} />
                <Route path="programs/advertising" element={<React.Suspense fallback={<div>Loading...</div>}><AdMiningPageNew /></React.Suspense>} />
                <Route path="programs/lucky-draw" element={<React.Suspense fallback={<div>Loading...</div>}><LuckyDrawPageNew /></React.Suspense>} />
                <Route path="programs/spin" element={<React.Suspense fallback={<div>Loading...</div>}><SpinWheelPage /></React.Suspense>} />
                <Route path="programs/insurance" element={<React.Suspense fallback={<div>Loading...</div>}><InsurancePageNew /></React.Suspense>} />
                <Route path="programs/ads" element={<React.Suspense fallback={<div>Loading...</div>}><AdvertisingPage /></React.Suspense>} />
                <Route path="programs/referrals" element={<React.Suspense fallback={<div>Loading...</div>}><ReferralsPageNew /></React.Suspense>} />
                <Route path="programs/loans" element={<React.Suspense fallback={<div>Loading...</div>}><LoansPageNew /></React.Suspense>} />
                <Route path="programs/bsk-bonus" element={<React.Suspense fallback={<div>Loading...</div>}><PurchasePage /></React.Suspense>} />
                <Route path="programs/staking" element={<React.Suspense fallback={<div>Loading...</div>}><StakingPageNew /></React.Suspense>} />
                <Route path="programs/staking/:id" element={<StakingDetailScreen />} />
                <Route path="programs/staking/:poolId/submit" element={<StakingSubmissionScreen />} />
                <Route path="programs/bsk" element={<BSKWalletPage />} />
                <Route path="programs/bsk-purchase-manual" element={<ManualBSKPurchaseScreen />} />
                <Route path="programs/crypto-conversion" element={<CryptoConversionScreen />} />
                <Route path="programs/bsk-withdraw" element={<BSKWithdrawScreen />} />
                <Route path="programs/bsk-transfer" element={<BSKTransferScreen />} />
                <Route path="programs/achievements" element={<GamificationScreen />} />
                <Route path="programs/badge-subscription" element={<BadgeSubscriptionScreen />} />
                <Route path="badge-subscription" element={<BadgeSubscriptionScreen />} />
                
                <Route path="design-review" element={<DesignReview />} />
                {/* Unknown Astra sub-route */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Admin Authentication */}
              <Route path="/admin/login" element={
                <AuthProviderAdmin>
                  <AdminLoginScreen />
                </AuthProviderAdmin>
              } />

              {/* Admin Console Routes - Clean DS */}
              <Route path="/admin/*" element={
                <AuthProviderAdmin>
                  <AdminRouteNew>
                    <AdminLayoutClean />
                  </AdminRouteNew>
                </AuthProviderAdmin>
              }>
                <Route index element={<AdminDashboardClean />} />
                <Route path="dashboard" element={<AdminDashboardClean />} />
                
                {/* Users Management */}
                <Route path="users" element={<AdminUsersClean />} />
                
                {/* Markets Management */}
                <Route path="markets" element={<AdminMarketsNova />} />
                <Route path="trading-orders" element={<React.Suspense fallback={<div>Loading...</div>}><AdminTradingOrders /></React.Suspense>} />
                <Route path="trading-engine" element={<React.Suspense fallback={<div>Loading...</div>}><AdminTradingEngine /></React.Suspense>} />
                
                {/* BSK Management */}
                <Route path="bsk" element={<AdminBSKManagementNova />} />
                <Route path="bsk-loans" element={<AdminBSKLoansNova />} />
                <Route path="bsk-manual-purchases" element={<AdminManualPurchasesScreen />} />
                <Route path="crypto-conversions" element={<AdminCryptoConversionsScreen />} />
                <Route path="bsk-withdrawals" element={<AdminBSKWithdrawalsScreen />} />
                <Route path="announcements" element={<AdminAnnouncementsScreen />} />
                
                {/* Programs */}
                <Route path="programs" element={<AdminProgramsClean />} />
                <Route path="programs/control-center" element={<React.Suspense fallback={<div>Loading...</div>}><ProgramControlCenter /></React.Suspense>} />
                <Route path="programs/templates" element={<React.Suspense fallback={<div>Loading...</div>}><ProgramTemplates /></React.Suspense>} />
                <Route path="programs/analytics" element={<React.Suspense fallback={<div>Loading...</div>}><AdminProgramAnalytics /></React.Suspense>} />
                <Route path="programs/editor/new" element={<React.Suspense fallback={<div>Loading...</div>}><AdminProgramEditorClean /></React.Suspense>} />
                <Route path="programs/editor/:id" element={<React.Suspense fallback={<div>Loading...</div>}><AdminProgramEditorClean /></React.Suspense>} />
                <Route path="programs/control" element={<React.Suspense fallback={<div>Loading...</div>}><AdminProgramsControl /></React.Suspense>} />
                <Route path="programs/control/ad-mining/:moduleId?" element={<React.Suspense fallback={<div>Loading...</div>}><AdMiningControlPanel /></React.Suspense>} />
                <Route path="programs/control/lucky-draw/:moduleId?" element={<React.Suspense fallback={<div>Loading...</div>}><LuckyDrawControlPanel /></React.Suspense>} />
                <Route path="programs/control/spin-wheel/:moduleId?" element={<React.Suspense fallback={<div>Loading...</div>}><SpinWheelControlPanel /></React.Suspense>} />
                
                {/* Gamification & Programs */}
                <Route path="spin" element={<AdminSpinNova />} />
                <Route path="staking" element={<AdminStakingNova />} />
                <Route path="subscriptions" element={<AdminSubscriptionsNova />} />
                <Route path="insurance" element={<AdminInsurance />} />
                <Route path="lucky-draw" element={<AdminNewLuckyDraw />} />
                <Route path="purchase-bonus" element={<AdminPurchaseBonusScreen />} />
                <Route path="referrals" element={<AdminTeamReferralsScreen />} />
                <Route path="team-referrals" element={<AdminTeamReferralsScreen />} />
                <Route path="funding" element={<AdminFunding />} />
                <Route path="funding/inr" element={<AdminINRFundingScreen />} />
                <Route path="currency" element={<CurrencyControlCenter />} />
                <Route path="transactions" element={<TransactionControlCenter />} />
                <Route path="users/financial" element={<UserFinancialManagement />} />
                
                {/* Reports & Settings */}
                <Route path="ads" element={<AdminAdsScreen />} />
                <Route path="settings" element={<AdminSettingsClean />} />
                <Route path="system/health" element={<React.Suspense fallback={<div>Loading...</div>}><AdminSystemHealth /></React.Suspense>} />
                <Route path="kyc" element={<React.Suspense fallback={<div>Loading...</div>}><KYCReviewNew /></React.Suspense>} />
                <Route path="kyc-review" element={<AdminKYCReview />} />
                <Route path="kyc/settings" element={<React.Suspense fallback={<div>Loading...</div>}><AdminKYCSettings /></React.Suspense>} />
                
                {/* Financial Management Routes - Phase 2-4 */}
                <Route path="transactions" element={<TransactionControlCenter />} />
                <Route path="users/financial" element={<UserFinancialManagement />} />
                <Route path="reports" element={<FinancialReports />} />
                <Route path="analytics" element={<FinancialAnalytics />} />
                
                <Route path="database-reset" element={<React.Suspense fallback={<div>Loading...</div>}><AdminDatabaseReset /></React.Suspense>} />
                <Route path="mobile-linking" element={<React.Suspense fallback={<div>Loading...</div>}><AdminMobileLinking /></React.Suspense>} />
              </Route>

              {/* Legacy Admin Console removed */}
              <Route path="/admin-legacy/*" element={<RemovedPage admin home="/admin" removed="Legacy admin routes have been removed." />} />

              {/* Utility Routes */}
            <Route path="/email-verification" element={<EmailVerificationScreen />} />
            <Route path="/email-verified" element={<EmailVerifiedScreen />} />
            <Route path="/email-verified" element={<EmailVerifiedScreen />} />
              <Route path="/email-verified" element={<EmailVerifiedScreen />} />
              <Route path="/reset-password" element={<ResetPasswordScreen />} />
              <Route path="/debug/catalog" element={<DebugCatalogScreen />} />
              <Route path="/debug/funding" element={<DebugFunding />} />
              <Route path="/debug/admin-test" element={<AdminCredentialsTest />} />

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
              
              {/* Public Program Hub Routes */}
              <Route path="/programs-hub" element={<React.Suspense fallback={<div>Loading...</div>}><ProgramsHub /></React.Suspense>} />
              <Route path="/programs-hub/:key" element={<React.Suspense fallback={<div>Loading...</div>}><ProgramDetail /></React.Suspense>} />
              <Route path="/programs-hub/:key/participate" element={<React.Suspense fallback={<div>Loading...</div>}><ProgramParticipate /></React.Suspense>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RouterWrapper>
          </BrowserRouter>
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;