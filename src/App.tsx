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
import { NotificationProvider } from "@/contexts/NotificationContext";
import { UnlockGate } from "@/components/UnlockGate";
import { useSecuritySync } from "@/hooks/useSecuritySync";
import { useOnboardingResumeProtection } from "@/hooks/useOnboardingResumeProtection";
import { useSessionIntegrityMonitor } from "@/hooks/useSessionIntegrityMonitor";
import { RouterWrapper } from "@/components/RouterWrapper";
import { AppInitializer } from "@/components/AppInitializer";
import { AppStateManager } from "@/components/AppStateManager";
import PrefixRedirect from "@/components/routing/PrefixRedirect";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Loading fallback component for Suspense
function LoadingFallback() {
  return (
    <div 
      className="h-screen w-full flex items-center justify-center bg-background"
      style={{ height: '100dvh' }}
    >
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Layouts
import AdminLayout from "@/layouts/AdminLayout";
import AdminLayoutClean from "@/layouts/AdminLayoutClean";
import AdminLayoutUnified from "@/layouts/AdminLayoutUnified";
import { AdminShellAdaptive } from "@/components/admin/nova/AdminShellAdaptive";
import { AuthLayout } from "@/layouts/AuthLayout";
import AuthOnboardingEntry from "@/pages/auth/AuthOnboardingEntry";

// Clean Admin Pages
import AdminDashboardClean from "./pages/admin/AdminDashboardClean";
import AdminDashboardUnified from "./pages/admin/AdminDashboardUnified";
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
import BadgeQualificationAdmin from "./pages/admin/BadgeQualificationAdmin";
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
const StakingControlPanel = React.lazy(() => import("./pages/admin/program-controls/StakingControlPanel"));
const InsuranceControlPanel = React.lazy(() => import("./pages/admin/program-controls/InsuranceControlPanel"));
const AdminOneTimeOffersPage = React.lazy(() => import("./pages/admin/AdminOneTimeOffersPage"));
const LoansControlPanel = React.lazy(() => import("./pages/admin/program-controls/LoansControlPanel"));
const TradingControlPanel = React.lazy(() => import("./pages/admin/program-controls/TradingControlPanel"));
const BadgesControlPanel = React.lazy(() => import("./pages/admin/program-controls/BadgesControlPanel"));
const ReferralsControlPanel = React.lazy(() => import("./pages/admin/program-controls/ReferralsControlPanel"));
const AdminProgramAnalytics = React.lazy(() => import("./pages/admin/AdminProgramAnalytics"));
const AuditLogsPage = React.lazy(() => import("./pages/admin/AuditLogs"));
const ProgramControlCenter = React.lazy(() => import("./pages/admin/ProgramControlCenter"));
const ProgramTemplates = React.lazy(() => import("./pages/admin/ProgramTemplates"));
const ProgramEconomicsDashboard = React.lazy(() => import("./pages/admin/ProgramEconomicsDashboard"));
const ProgramEconomicsAnalytics = React.lazy(() => import("./pages/admin/ProgramEconomicsAnalytics"));
const ProgramsHub = React.lazy(() => import("./pages/ProgramsHub"));
const ProgramDetail = React.lazy(() => import("./pages/ProgramDetail"));
const ProgramParticipate = React.lazy(() => import("./pages/ProgramParticipate"));
const AdminSystemHealth = React.lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminUsersManagementNova = React.lazy(() => import("./pages/admin/AdminUsersManagementNova"));
const AdminUsersManagement = React.lazy(() => import("./pages/admin/AdminUsersManagement"));
const AdminMobileLinking = React.lazy(() => import("./pages/admin/AdminMobileLinking"));
import AdminBSKManagementNova from "./pages/admin/AdminBSKManagementNova";
import AdminBSKLoansNova from "./pages/admin/AdminBSKLoansNova";
import AdminManualPurchasesScreen from "./pages/AdminManualPurchasesScreen";
import ManualBSKPurchaseScreen from "./pages/ManualBSKPurchaseScreen";
import AdminCryptoConversionsScreen from "./pages/AdminCryptoConversionsScreen";
import AdminBSKTransferSend from "./pages/AdminBSKTransferSend";
import AdminBSKTransferHistory from "./pages/admin/AdminBSKTransferHistory";
const AdminAnnouncementsManager = React.lazy(() => import("./pages/admin/AdminAnnouncementsManager"));
const AdminCarouselManager = React.lazy(() => import("./pages/admin/AdminCarouselManager"));
const AdminProgramConfigEditor = React.lazy(() => import("./pages/admin/AdminProgramConfigEditor"));
import BSKTransferScreen from "./pages/BSKTransferScreen";
import AdminKYCReview from "./pages/AdminKYCReview";
const KYCReviewNew = React.lazy(() => import("./pages/admin/KYCReviewNew"));
const AdminKYCSettings = React.lazy(() => import("./pages/AdminKYCSettings"));
const AdminRoleManagement = React.lazy(() => import("./pages/admin/AdminRoleManagement"));
const AdminBadgeSystem = React.lazy(() => import("./pages/admin/AdminBadgeSystem"));
const AdminBSKManagement = React.lazy(() => import("./pages/admin/AdminBSKManagement"));
const VIPMilestoneMonitor = React.lazy(() => import("./pages/admin/VIPMilestoneMonitor"));
const BSKLedgerViewer = React.lazy(() => import("./pages/admin/BSKLedgerViewer"));
const AdminBSKLedgerComplete = React.lazy(() => import("./pages/admin/AdminBSKLedgerComplete"));
const BSKReconciliation = React.lazy(() => import("./pages/admin/BSKReconciliation"));
const AdminBSKWalletAdjustment = React.lazy(() => import("./pages/admin/AdminBSKWalletAdjustment"));
const AdminUserCleanup = React.lazy(() => import("./pages/admin/AdminUserCleanup"));
const OrphanedUsersCleanup = React.lazy(() => import("./pages/admin/OrphanedUsersCleanup"));
const AdminTestUserGenerator = React.lazy(() => import("./pages/admin/AdminTestUserGenerator"));
import ManualReferralAssignment from "./pages/admin/ManualReferralAssignment";
import RetroactiveCommissionFix from "./pages/admin/RetroactiveCommissionFix";
import TreeHealthDashboard from "./pages/admin/TreeHealthDashboard";
import MissingReferralsManager from "./pages/admin/MissingReferralsManager";

// Guards
import UserRoute from "@/components/UserRoute";
import AdminRouteNew from "@/components/AdminRouteNew";

// Landing & Auth Pages
import SplashScreen from "./pages/SplashScreen";
import WelcomeScreen from "./pages/WelcomeScreen";
import WelcomeScreen1 from "./pages/WelcomeScreen1";
import WelcomeScreen2 from "./pages/WelcomeScreen2";
import WelcomeScreen3 from "./pages/WelcomeScreen3";
import AuthCallback from "./pages/AuthCallback";
import AppLockScreen from "./pages/AppLockScreen";
import LockScreen from "./pages/lock/LockScreen";
import { AppLockGuard } from "@/components/AppLockGuard";
import WalletLoginScreen from "./pages/WalletLoginScreen";

// Onboarding Pages
import OnboardingFlow from "./pages/OnboardingFlow";
import OnboardingIndexScreen from "./pages/OnboardingIndexScreen";
import WalletSelectionScreen from "./pages/WalletSelectionScreen";
import RecoveryVerifyScreen from "./pages/RecoveryVerifyScreen";
import LandingScreen from "./pages/LandingScreen";
import SignupScreen from "./pages/auth/SignupScreen";
import LoginScreen from "./pages/auth/LoginScreen";
import CheckEmailScreen from "./pages/auth/CheckEmailScreen";
import WalletUnlockedScreen from "./pages/auth/WalletUnlockedScreen";
import RecoverWalletScreen from "./pages/auth/RecoverWalletScreen";
import ForgotPasswordScreen from "./pages/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./pages/auth/ResetPasswordScreen";
import VerifyResetCodeScreen from "./pages/auth/VerifyResetCodeScreen";
import AccountCreatedCelebration from "./pages/onboarding/AccountCreatedCelebration";

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
import BadgeSubscriptionScreen from "./pages/BadgeSubscriptionScreen";
import StakingScreen from "./pages/StakingScreen";
import StakingDetailScreen from "./pages/StakingDetailScreen";
import StakingSubmissionScreen from "./pages/StakingSubmissionScreen";
import NewLuckyDraw from "./components/NewLuckyDraw";
import BSKWithdrawScreen from "@/pages/BSKWithdrawScreen";
import AdminBSKWithdrawalsScreen from "@/pages/AdminBSKWithdrawalsScreen";
import AdminCryptoWithdrawalsScreen from "@/pages/AdminCryptoWithdrawalsScreen";
import CryptoConversionScreen from "./pages/CryptoConversionScreen";

import SpinHistoryScreen from "./pages/SpinHistoryScreen";
import AdvertisingMiningScreen from "./pages/AdvertisingMiningScreen";
import BSKPromotionScreen from "./pages/BSKPromotionScreen";
import { AdminAdsScreen } from "./pages/AdminAdsScreen";
import InsuranceScreen from "./components/InsuranceScreen";
import AccidentInsurancePurchase from './pages/insurance/AccidentInsurancePurchase';
import TradingInsurancePurchase from './pages/insurance/TradingInsurancePurchase';
import LifeInsurancePurchase from './pages/insurance/LifeInsurancePurchase';
import BSKLoansScreen from "./pages/BSKLoansScreen";
import FileClaimScreen from "./pages/FileClaimScreen";
import HistoryScreen from "./pages/HistoryScreen";
import GamificationScreen from "./pages/GamificationScreen";
import ProfileScreen from "./pages/ProfileScreen";

// New Program Pages (All wrapped with ProgramAccessGate)
const AdvertisingPage = React.lazy(() => import("./pages/programs/AdvertisingPage"));
const LuckyDrawPage = React.lazy(() => import("./pages/programs/LuckyDrawPage"));
const LuckyDrawTicketsPage = React.lazy(() => import("./pages/programs/LuckyDrawTicketsPage"));
const StakingPage = React.lazy(() => import("./pages/programs/StakingPage"));

const InsurancePage = React.lazy(() => import("./pages/programs/InsurancePage"));
const BSKPromotionsPage = React.lazy(() => import("./pages/programs/BSKPromotionsPage"));
import TeamReferralsNew from "./pages/programs/TeamReferralsNew";
import TeamTreeView from "./pages/programs/TeamTreeView";
import CommissionHistory from "./pages/programs/CommissionHistory";
const LoansPageNew = React.lazy(() => import("./pages/programs/LoansPage"));
const PurchasePage = React.lazy(() => import("./pages/programs/PurchasePage"));
const OneTimePurchasePage = React.lazy(() => import("./pages/programs/OneTimePurchasePage"));
const PurchaseHistoryPage = React.lazy(() => import("./pages/programs/PurchaseHistoryPage"));

// History Pages
const InsuranceHistoryPage = React.lazy(() => import("./pages/programs/InsuranceHistoryPage"));
const LoansHistoryPage = React.lazy(() => import("./pages/programs/LoansHistoryPage"));
const AdMiningHistoryPage = React.lazy(() => import("./pages/programs/AdMiningHistoryPage"));

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminDatabaseReset = React.lazy(() => import("./pages/AdminDatabaseReset"));
const AdminDatabaseCleanup = React.lazy(() => import("./pages/admin/AdminDatabaseCleanup"));
import AdminUsers from "./pages/AdminUsers";
import AdminAssets from "./pages/AdminAssets";
import AdminMarkets from "./pages/AdminMarkets";
import AdminMarketFeedScreen from "./pages/AdminMarketFeedScreen";
import AdminFunding from "./pages/AdminFunding";
import { AdminSubscriptions } from "./components/AdminSubscriptions";
import AdminReferralProgram from "./pages/AdminReferralProgram";
import AdminTeamReferralsScreen from "./pages/AdminTeamReferralsScreen";
import Admin50LevelReferrals from "./pages/Admin50LevelReferrals";
import { AdminStaking } from "./components/AdminStaking";
import AdminNewLuckyDraw from "./components/AdminNewLuckyDraw";
import AdminInsurance from "./components/AdminInsurance";
import { AdminAds } from "./components/AdminAds";
import { AdminFees } from "./components/AdminFees";
import { AdminTradingFeesSimple } from "./components/AdminTradingFeesSimple";
import AdminPurchaseBonusScreen from "./pages/AdminPurchaseBonusScreen";
import AdminCredentialsTest from "./pages/AdminCredentialsTest";
import AdminSystemScreen from "./pages/AdminSystemScreen";
import CurrencyControlCenter from "./pages/admin/CurrencyControlCenter";
import TransactionControlCenter from "./pages/admin/TransactionControlCenter";
import UserFinancialManagement from "./pages/admin/UserFinancialManagement";
import FinancialReports from "./pages/admin/FinancialReports";
import FinancialAnalytics from "./pages/admin/FinancialAnalytics";
import AdminCommissionHistory from "./pages/admin/AdminCommissionHistory";
import RetroactiveRewardsProcessor from "./pages/admin/RetroactiveRewardsProcessor";

// Utility Pages
import { SupportScreen } from "@/pages/SupportScreen";
import { SupportTicketScreen } from "@/pages/SupportTicketScreen";
import { AdminSupportScreen } from "@/pages/AdminSupportScreen";
import { AdminSupportTicketScreen } from "@/pages/AdminSupportTicketScreen";
import { AdminNotificationsScreen } from "@/pages/AdminNotificationsScreen";
import { NotificationsScreen } from "@/pages/NotificationsScreen";
import NotFound from "@/pages/NotFound";
import RemovedPage from "@/pages/RemovedPage";
import SpinVerifyScreen from "@/pages/SpinVerifyScreen";
import BSKVestingScreen from "@/pages/BSKVestingScreen";
import { BSKWalletPage } from "@/pages/astra/BSKWalletPage";
import { WalletPage } from "@/pages/astra/WalletPage";
import { OnchainWalletPage } from "@/pages/astra/OnchainWalletPage";
import CryptoWalletPage from "@/pages/astra/CryptoWalletPage";


import { AstraLayout } from "@/layouts/AstraLayout";
import { HomePageRebuilt } from "@/pages/astra/HomePageRebuilt";
import { ReferralCaptureGuard } from "@/components/ReferralCaptureGuard";
import { ProgramsPageRebuilt } from "@/pages/astra/ProgramsPageRebuilt";
import { ProgramsPagePro } from "@/pages/astra/ProgramsPagePro";
import { TradingOverview } from "@/pages/astra/TradingOverview";
import { TradingPairPage } from "@/pages/astra/TradingPairPage";
import { ProfileHub } from "@/pages/ProfileHub";
import { KYCPage } from "@/pages/KYCPage";
import KYCSubmission from "@/pages/KYCSubmission";
import KYCSubmissionSimple from "@/pages/KYCSubmissionSimple";
import { IDCardPage } from "@/pages/IDCardPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { SettingsPage } from "@/pages/SettingsPage";

import { DownloadPage } from "@/pages/DownloadPage";
import { DeepLinkResolver } from "@/pages/DeepLinkResolver";
import { InsurancePage as InsurancePageAstra } from "@/pages/astra/InsurancePage";
import { AdvertiseMiningPage } from "@/pages/astra/AdvertiseMiningPage";
import DesignReview from "@/pages/astra/DesignReview";
import { SupportPage } from "@/pages/SupportPage";

// Phase 3 & 4 User Programs
const ReferralsPageAstra = React.lazy(() => import("./pages/astra/ReferralsPage"));
const AdMiningPageNew = React.lazy(() => import("./pages/programs/AdMiningPageNew"));
const LuckyDrawPageNew = React.lazy(() => import("./pages/programs/LuckyDrawPageNew"));
const TeamReferralsPageNew = React.lazy(() => import("./pages/programs/TeamReferralsPageNew"));
const StakingPageNewV2 = React.lazy(() => import("./pages/programs/StakingPageNew"));
const TradingPageNew = React.lazy(() => import("./pages/programs/TradingPageNew"));
const TradingPro = React.lazy(() => import("./pages/TradingPro"));
const InsurancePageNewV2 = React.lazy(() => import("./pages/programs/InsurancePageNew"));
const BSKLoansPageNew = React.lazy(() => import("./pages/programs/BSKLoansPageNew"));
const BSKPromotionsPageNew = React.lazy(() => import("./pages/programs/BSKPromotionsPageNew"));
const LoansPage = React.lazy(() => import("./pages/astra/LoansPage"));
const LoansOverviewPage = React.lazy(() => import("./pages/LoansOverviewPage"));
const LoanDetailsPageUser = React.lazy(() => import("./pages/programs/LoanDetailsPage"));

// ✅ V3 Spin Wheel with SpinWheel3D (4 segments, premium design)
const ISmartSpinScreen = React.lazy(() => import("@/pages/ISmartSpinScreen"));

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Web3Provider>
            <NotificationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </NotificationProvider>
          </Web3Provider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Separate component that uses hooks requiring providers
function AppContent() {
  const [sessionInitialized, setSessionInitialized] = React.useState(false);

  // Initialize SessionManager once on app start
  React.useEffect(() => {
    const initSession = async () => {
      try {
        // SECURITY: Remove insecure localStorage entries on app start
        const { cleanupInsecureStorage } = await import('@/utils/securityCleanup');
        cleanupInsecureStorage();
        
        const { SessionManager } = await import('@/services/SessionManager');
        
        // Setup auth listener
        SessionManager.setupAuthListener();
        
        // Initialize session state with timeout fallback to avoid infinite spinner
        const initPromise = SessionManager.initialize();
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 4000));
        const result = await Promise.race([initPromise, timeoutPromise]);
        if (result === undefined) {
          // Race resolved by timeout - continue rendering, background init will finalize state
          console.warn('[App] Session initialization timed out, proceeding with background init');
        }
      } catch (e) {
        console.error('[App] Initialization error:', e);
      } finally {
        setSessionInitialized(true);
        // Kick off a background ensure-init in case we timed out
        import('@/services/SessionManager').then(({ SessionManager }) => {
          setTimeout(() => SessionManager.initialize(), 0);
        });
      }
    };

    initSession();
  }, []);

  // Show loading while session initializes
  if (!sessionInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-white" />
          <p className="text-white/80">Initializing...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <AppStateManager />
      <RouterWrapper>
        <Routes>
          {/* Landing & Splash */}
          <Route path="/" element={<LandingScreen />} />
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/deeplink/r/:code" element={<DeepLinkResolver />} />

          {/* Auth Routes - New Clean Flow */}
          <Route path="/auth/signup" element={<SignupScreen />} />
          <Route path="/auth/login" element={<LoginScreen />} />
          <Route path="/auth/check-email" element={<CheckEmailScreen />} />
          <Route path="/auth/import-wallet" element={
            <AuthProviderUser>
              {React.createElement(React.lazy(() => import('./pages/auth/ImportWalletAuth')))}
            </AuthProviderUser>
          } />
          <Route path="/auth/import-wallet-backup" element={
            <AuthProviderUser>
              {React.createElement(React.lazy(() => import('./pages/auth/ImportWalletBackup')))}
            </AuthProviderUser>
          } />
          <Route path="/auth/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/auth/verify-reset-code" element={<VerifyResetCodeScreen />} />
          <Route path="/auth/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/auth/recover" element={<RecoverWalletScreen />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/lock" element={
            <AuthProviderUser>
              <AppLockScreen />
            </AuthProviderUser>
          } />
          <Route path="/auth/wallet-unlocked" element={
            <AuthProviderUser>
              <WalletUnlockedScreen />
            </AuthProviderUser>
          } />
          
          {/* Legacy redirects */}
          <Route path="/lock" element={<Navigate to="/auth/lock" replace />} />
          <Route path="/lock/setup-pin" element={<Navigate to="/onboarding/security" replace />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          <Route path="/welcome-1" element={<Navigate to="/" replace />} />
          <Route path="/welcome-2" element={<Navigate to="/" replace />} />
          <Route path="/welcome-3" element={<Navigate to="/" replace />} />

          {/* Onboarding Flow - Post-authentication */}
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/onboarding/account-created" element={
            <AuthProviderUser>
              <AccountCreatedCelebration />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/wallet" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/wallet/create" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/wallet/import" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/security" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/biometric" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/onboarding/success" element={
            <AuthProviderUser>
              <OnboardingFlow />
            </AuthProviderUser>
          } />
          <Route path="/recovery/verify" element={<RecoveryVerifyScreen />} />
          <Route path="/wallet-selection" element={<WalletSelectionScreen />} />

          {/* Legacy Auth Routes - Redirect to new flow */}
          <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/register" element={<Navigate to="/auth/signup" replace />} />
          <Route path="/auth/verify-code" element={<Navigate to="/auth/login" replace />} />

              {/* Legacy User App removed */}
              <Route path="/app-legacy/*" element={<RemovedPage home="/app/home" removed="Legacy user routes have been removed." />} />

              {/* User App Routes - New Astra Design System */}
              <Route path="/app/*" element={
                <AuthProviderUser>
                  <UserRoute>
                    <AppLockGuard>
                      <UnlockGate>
                        <ReferralCaptureGuard>
                          <AstraLayout />
                        </ReferralCaptureGuard>
                      </UnlockGate>
                    </AppLockGuard>
                  </UserRoute>
                </AuthProviderUser>
              }>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<HomePageRebuilt />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="wallet/crypto" element={<CryptoWalletPage />} />
              <Route path="wallet/onchain" element={<OnchainWalletPage />} />
              <Route path="wallet/deposit" element={<DepositScreen />} />
              <Route path="wallet/withdraw" element={<WithdrawScreen />} />
              <Route path="wallet/send" element={<SendScreen />} />
              <Route path="wallet/transfer" element={<TransferScreen />} />
              <Route path="wallet/history" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/OnchainHistoryPage')))}</React.Suspense>} />
              <Route path="wallet/history/onchain" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/OnchainHistoryPage')))}</React.Suspense>} />
              <Route path="wallet/history/crypto" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/CryptoHistoryPage')))}</React.Suspense>} />
              <Route path="wallet/history/bsk" element={<HistoryScreen />} />
              <Route path="wallet/loan" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/wallet/USDILoanPage').then(m => ({ default: m.USDILoanPage }))))}</React.Suspense>} />
              <Route path="history/crypto" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/CryptoHistoryPage')))}</React.Suspense>} />
              <Route path="programs" element={<ProgramsScreen />} />
              <Route path="programs/:programKey" element={<ProgramDetailPage />} />
              <Route path="trade" element={<TradingOverview />} />
              <Route path="trade/:symbol" element={<TradingPairPage />} />
              <Route path="trade-pro" element={<React.Suspense fallback={<LoadingFallback />}><TradingPro /></React.Suspense>} />
              <Route path="trading" element={<Navigate to="/app/trade" replace />} />
              <Route path="swap" element={<SwapScreen />} />
              
              {/* On-chain Crypto Staking */}
              <Route path="staking" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/CryptoStakingScreen')))}</React.Suspense>} />
              <Route path="staking/:planId" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/CryptoStakingScreen')))}</React.Suspense>} />
              <Route path="staking/deposit" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/StakingDepositScreen')))}</React.Suspense>} />
              <Route path="staking/withdraw" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/StakingWithdrawScreen')))}</React.Suspense>} />
              
              {/* Profile Hub */}
              <Route path="profile" element={<ProfileHub />} />
              <Route path="profile/kyc" element={<KYCSubmissionSimple />} />
              <Route path="profile/id-card" element={<IDCardPage />} />
              <Route path="profile/security" element={<SecurityPage />} />
              <Route path="profile/notify" element={<NotificationsPage />} />
              <Route path="profile/settings" element={<SettingsPage />} />
              <Route path="profile/referrals" element={<React.Suspense fallback={<LoadingFallback />}><ReferralsPageAstra /></React.Suspense>} />
              <Route path="profile/claim-referral" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/ClaimReferralCodePage')))}</React.Suspense>} />
              <Route path="support" element={<SupportPage />} />
              <Route path="wallet" element={<WalletPage />} />
                
                {/* Programs - All with BSK Balance Checks */}
                <Route path="programs/ad-mining" element={<React.Suspense fallback={<LoadingFallback />}><AdMiningPageNew /></React.Suspense>} />
                <Route path="programs/advertising" element={<React.Suspense fallback={<LoadingFallback />}><AdMiningPageNew /></React.Suspense>} />
                <Route path="programs/lucky-draw" element={<React.Suspense fallback={<LoadingFallback />}><LuckyDrawPage /></React.Suspense>} />
                <Route path="programs/lucky-draw/tickets" element={<React.Suspense fallback={<LoadingFallback />}><LuckyDrawTicketsPage /></React.Suspense>} />
                <Route path="programs/spin" element={<React.Suspense fallback={<LoadingFallback />}><ISmartSpinScreen /></React.Suspense>} />
                <Route path="spin/history" element={<React.Suspense fallback={<LoadingFallback />}><SpinHistoryScreen /></React.Suspense>} />
                <Route path="programs/team-referrals" element={<React.Suspense fallback={<LoadingFallback />}><TeamReferralsNew /></React.Suspense>} />
                <Route path="programs/team-referrals/team" element={<React.Suspense fallback={<LoadingFallback />}><TeamTreeView /></React.Suspense>} />
                <Route path="programs/team-referrals/earnings" element={<React.Suspense fallback={<LoadingFallback />}><CommissionHistory /></React.Suspense>} />
                <Route path="programs/team-referrals/vip-milestone-history" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/programs/VIPMilestoneHistoryPage')))}</React.Suspense>} />
                <Route path="programs/staking" element={<React.Suspense fallback={<LoadingFallback />}><StakingPage /></React.Suspense>} />
                <Route path="programs/trading" element={<React.Suspense fallback={<LoadingFallback />}><TradingPageNew /></React.Suspense>} />
                <Route path="programs/insurance" element={<React.Suspense fallback={<LoadingFallback />}><InsurancePage /></React.Suspense>} />
                <Route path="programs/bsk-loans" element={<Navigate to="/app/programs" replace />} />
                <Route path="programs/bsk-promotions" element={<React.Suspense fallback={<LoadingFallback />}><BSKPromotionsPage /></React.Suspense>} />
                
                {/* Legacy program routes */}
                <Route path="programs/ads" element={<React.Suspense fallback={<LoadingFallback />}><AdvertisingPage /></React.Suspense>} />
                <Route path="programs/referrals" element={<Navigate to="/app/programs/team-referrals" replace />} />
                <Route path="programs/loans" element={<Navigate to="/app/programs" replace />} />
                
                {/* Loans (user portfolio) */}
                <Route
                  path="loans/*"
                  element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <LoansOverviewPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="loans/details"
                  element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <LoanDetailsPageUser />
                    </React.Suspense>
                  }
                />
                <Route
                  path="loans/history"
                  element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <LoansHistoryPage />
                    </React.Suspense>
                  }
                />
                
                <Route path="programs/bsk-bonus" element={<React.Suspense fallback={<LoadingFallback />}><OneTimePurchasePage /></React.Suspense>} />
                <Route path="programs/bsk-purchase-history" element={<React.Suspense fallback={<LoadingFallback />}><PurchaseHistoryPage /></React.Suspense>} />
                <Route path="programs/staking/:id" element={<StakingDetailScreen />} />
                <Route path="programs/staking/:poolId/submit" element={<StakingSubmissionScreen />} />
                <Route path="programs/bsk" element={<BSKWalletPage />} />
                <Route path="programs/bsk/history" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/BSKWalletHistoryPage')))}</React.Suspense>} />
                <Route path="programs/bsk-purchase-manual" element={<ManualBSKPurchaseScreen />} />
                <Route path="programs/crypto-conversion" element={<CryptoConversionScreen />} />
                <Route path="programs/bsk-withdraw" element={<BSKWithdrawScreen />} />
                <Route path="programs/bsk-transfer" element={<BSKTransferScreen />} />
                <Route path="programs/bsk-migrate" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/astra/BSKMigratePage').then(m => ({ default: m.BSKMigratePage }))))}</React.Suspense>} />
                <Route path="programs/achievements" element={<GamificationScreen />} />
                <Route path="programs/badge-subscription" element={<BadgeSubscriptionScreen />} />
                <Route path="badge-subscription" element={<BadgeSubscriptionScreen />} />
                
                {/* Insurance Routes - Phase 7 */}
                <Route path="insurance" element={<InsuranceScreen />} />
                <Route path="insurance/purchase/accident" element={<AccidentInsurancePurchase />} />
                <Route path="insurance/purchase/trading" element={<TradingInsurancePurchase />} />
                <Route path="insurance/purchase/life" element={<LifeInsurancePurchase />} />
                
                <Route path="design-review" element={<DesignReview />} />
                {/* Unknown Astra sub-route */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Admin Authentication */}
              <Route path="/admin/login" element={
                <AuthProviderAdmin>
                  <AdminLogin />
                </AuthProviderAdmin>
              } />

              {/* Admin Console Routes - Unified World-Class DS */}
              <Route path="/admin/*" element={
                <AuthProviderAdmin>
                  <AdminRouteNew>
                    <AdminLayoutUnified />
                  </AdminRouteNew>
                </AuthProviderAdmin>
              }>
                <Route index element={<AdminDashboardUnified />} />
                <Route path="dashboard" element={<AdminDashboardUnified />} />
                
                {/* Users Management */}
                <Route path="users" element={<React.Suspense fallback={<LoadingFallback />}><AdminUsersManagement /></React.Suspense>} />
                <Route path="users-nova" element={<React.Suspense fallback={<LoadingFallback />}><AdminUsersManagementNova /></React.Suspense>} />
                <Route path="users-clean" element={<AdminUsersClean />} />
                
                {/* Markets Management */}
                <Route path="markets" element={<AdminMarketsNova />} />
                <Route path="trading-orders" element={<React.Suspense fallback={<LoadingFallback />}><AdminTradingOrders /></React.Suspense>} />
                <Route path="trading-engine" element={<React.Suspense fallback={<LoadingFallback />}><AdminTradingEngine /></React.Suspense>} />
                
                {/* BSK Management */}
                <Route path="bsk-management" element={<AdminBSKManagementNova />} />
                <Route path="bsk-send" element={<AdminBSKTransferSend />} />
                <Route path="bsk-transfer-history" element={<AdminBSKTransferHistory />} />
                <Route path="bsk-loans" element={<AdminBSKLoansNova />} />
                <Route path="bsk-manual-purchases" element={<AdminManualPurchasesScreen />} />
                <Route path="crypto-conversions" element={<AdminCryptoConversionsScreen />} />
                <Route path="bsk-withdrawals" element={<AdminBSKWithdrawalsScreen />} />
                <Route path="crypto-withdrawals" element={<AdminCryptoWithdrawalsScreen />} />
                <Route path="badge-commissions" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/BadgeCommissions')))}</React.Suspense>} />
                <Route path="announcements" element={<React.Suspense fallback={<LoadingFallback />}><AdminAnnouncementsManager /></React.Suspense>} />
                
                {/* Programs */}
                <Route path="programs" element={<AdminProgramsClean />} />
                <Route path="programs/economics" element={<React.Suspense fallback={<LoadingFallback />}><ProgramEconomicsDashboard /></React.Suspense>} />
                <Route path="programs/economics/analytics" element={<React.Suspense fallback={<LoadingFallback />}><ProgramEconomicsAnalytics /></React.Suspense>} />
                <Route path="program-economics-analytics" element={<React.Suspense fallback={<LoadingFallback />}><ProgramEconomicsAnalytics /></React.Suspense>} />
                <Route path="programs/control-center" element={<React.Suspense fallback={<LoadingFallback />}><ProgramControlCenter /></React.Suspense>} />
                <Route path="programs/templates" element={<React.Suspense fallback={<LoadingFallback />}><ProgramTemplates /></React.Suspense>} />
                <Route path="programs/analytics" element={<React.Suspense fallback={<LoadingFallback />}><AdminProgramAnalytics /></React.Suspense>} />
                <Route path="programs/editor/new" element={<React.Suspense fallback={<LoadingFallback />}><AdminProgramEditorClean /></React.Suspense>} />
                <Route path="programs/editor/:id" element={<React.Suspense fallback={<LoadingFallback />}><AdminProgramEditorClean /></React.Suspense>} />
                <Route path="programs/control" element={<React.Suspense fallback={<LoadingFallback />}><AdminProgramsControl /></React.Suspense>} />
                <Route path="programs/control/ad-mining/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><AdMiningControlPanel /></React.Suspense>} />
                <Route path="programs/control/lucky-draw/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><LuckyDrawControlPanel /></React.Suspense>} />
                <Route path="programs/control/spin-wheel/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><SpinWheelControlPanel /></React.Suspense>} />
                <Route path="programs/control/staking/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><StakingControlPanel /></React.Suspense>} />
                <Route path="programs/control/insurance/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><InsuranceControlPanel /></React.Suspense>} />
                <Route path="programs/control/loans/:moduleId?" element={<AdminBSKLoansNova />} />
                <Route path="programs/control/trading/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><TradingControlPanel /></React.Suspense>} />
                <Route path="programs/control/badges/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><BadgesControlPanel /></React.Suspense>} />
                <Route path="programs/control/referrals/:moduleId?" element={<React.Suspense fallback={<LoadingFallback />}><ReferralsControlPanel /></React.Suspense>} />
                
                {/* Gamification & Programs */}
                <Route path="spin" element={<AdminSpinNova />} />
                <Route path="staking" element={<AdminStakingNova />} />
                <Route path="badge-qualification" element={<BadgeQualificationAdmin />} />
                <Route path="subscriptions" element={<AdminSubscriptionsNova />} />
                <Route path="insurance" element={<AdminInsurance />} />
                <Route path="lucky-draw" element={<AdminNewLuckyDraw />} />
                <Route path="purchase-bonus" element={<AdminPurchaseBonusScreen />} />
                <Route path="one-time-offers" element={<React.Suspense fallback={<LoadingFallback />}><AdminOneTimeOffersPage /></React.Suspense>} />
                <Route path="offer-purchase-history" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/AdminOfferPurchaseHistory')))}</React.Suspense>} />
                <Route path="audit-logs" element={<React.Suspense fallback={<LoadingFallback />}><AuditLogsPage /></React.Suspense>} />
                <Route path="referrals" element={<AdminTeamReferralsScreen />} />
                <Route path="team-referrals" element={<AdminTeamReferralsScreen />} />
                <Route path="50-level-referrals" element={<Admin50LevelReferrals />} />
                <Route path="manual-referral-assignment" element={<ManualReferralAssignment />} />
                <Route path="retroactive-commission-fix" element={<RetroactiveCommissionFix />} />
                <Route path="tree-health" element={<TreeHealthDashboard />} />
                <Route path="missing-referrals" element={<MissingReferralsManager />} />
                <Route path="referral-debugger" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/ReferralDebugger')))}</React.Suspense>} />
                <Route path="funding" element={<AdminFunding />} />
                <Route path="currency" element={<CurrencyControlCenter />} />
                <Route path="transactions" element={<TransactionControlCenter />} />
                <Route path="users/financial" element={<UserFinancialManagement />} />
                
                {/* Reports & Settings */}
                <Route path="ads" element={<AdminAdsScreen />} />
                <Route path="carousel" element={<React.Suspense fallback={<LoadingFallback />}><AdminCarouselManager /></React.Suspense>} />
                <Route path="programs/config" element={<React.Suspense fallback={<LoadingFallback />}><AdminProgramConfigEditor /></React.Suspense>} />
                <Route path="settings" element={<AdminSettingsClean />} />
                <Route path="system/health" element={<React.Suspense fallback={<LoadingFallback />}><AdminSystemHealth /></React.Suspense>} />
                <Route path="kyc" element={<React.Suspense fallback={<LoadingFallback />}><KYCReviewNew /></React.Suspense>} />
                <Route path="kyc-review" element={<React.Suspense fallback={<LoadingFallback />}><KYCReviewNew /></React.Suspense>} />
                <Route path="kyc/settings" element={<React.Suspense fallback={<LoadingFallback />}><AdminKYCSettings /></React.Suspense>} />
                
                {/* Phase 5: Role & Badge Management */}
                <Route path="roles" element={<React.Suspense fallback={<LoadingFallback />}><AdminRoleManagement /></React.Suspense>} />
                <Route path="badges" element={<React.Suspense fallback={<LoadingFallback />}><AdminBadgeSystem /></React.Suspense>} />
                
                {/* Phase 6: BSK Management */}
                <Route path="bsk" element={<React.Suspense fallback={<LoadingFallback />}><AdminBSKManagement /></React.Suspense>} />
                <Route path="bsk-wallet-adjustment" element={<React.Suspense fallback={<LoadingFallback />}><AdminBSKWalletAdjustment /></React.Suspense>} />
                <Route path="bsk-ledger" element={<React.Suspense fallback={<LoadingFallback />}><BSKLedgerViewer /></React.Suspense>} />
                <Route path="bsk-ledger-complete" element={<React.Suspense fallback={<LoadingFallback />}><AdminBSKLedgerComplete /></React.Suspense>} />
                <Route path="bsk-reconciliation" element={<React.Suspense fallback={<LoadingFallback />}><BSKReconciliation /></React.Suspense>} />
                <Route path="bsk-onchain-migration" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/BSKOnchainMigration')))}</React.Suspense>} />
                <Route path="bsk-migration-audit" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/BSKMigrationAudit')))}</React.Suspense>} />
                <Route path="bsk-migration-settings" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/BSKMigrationSettings')))}</React.Suspense>} />
                <Route path="vip-milestones" element={<React.Suspense fallback={<LoadingFallback />}><VIPMilestoneMonitor /></React.Suspense>} />
                
                {/* Financial Management Routes - Phase 2-4 */}
                <Route path="transactions" element={<TransactionControlCenter />} />
                <Route path="users/financial" element={<UserFinancialManagement />} />
                <Route path="reports" element={<FinancialReports />} />
                <Route path="analytics" element={<FinancialAnalytics />} />
                
                <Route path="database-reset" element={<React.Suspense fallback={<LoadingFallback />}><AdminDatabaseReset /></React.Suspense>} />
                <Route path="database-cleanup" element={<React.Suspense fallback={<LoadingFallback />}><AdminDatabaseCleanup /></React.Suspense>} />
                <Route path="user-cleanup" element={<React.Suspense fallback={<LoadingFallback />}><AdminUserCleanup /></React.Suspense>} />
                <Route path="orphaned-users-cleanup" element={<React.Suspense fallback={<LoadingFallback />}><OrphanedUsersCleanup /></React.Suspense>} />
                <Route path="test-user-generator" element={<React.Suspense fallback={<LoadingFallback />}><AdminTestUserGenerator /></React.Suspense>} />
                <Route path="mobile-linking" element={<React.Suspense fallback={<LoadingFallback />}><AdminMobileLinking /></React.Suspense>} />
                <Route path="generate-hot-wallet" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/GenerateHotWallet')))}</React.Suspense>} />
                <Route path="staking-wallet" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/StakingHotWalletAdmin')))}</React.Suspense>} />
                <Route path="migration-hot-wallet" element={<React.Suspense fallback={<LoadingFallback />}>{React.createElement(React.lazy(() => import('./pages/admin/MigrationHotWalletAdmin')))}</React.Suspense>} />
              </Route>

              {/* Legacy Admin Console removed */}
              <Route path="/admin-legacy/*" element={<RemovedPage admin home="/admin" removed="Legacy admin routes have been removed." />} />

              {/* Utility Routes */}
              <Route path="/reset-password" element={<ResetPasswordScreen />} />
              <Route path="/debug/admin-test" element={<AdminCredentialsTest />} />


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
              <Route path="/programs-hub" element={<React.Suspense fallback={<LoadingFallback />}><ProgramsHub /></React.Suspense>} />
              <Route path="/programs-hub/:key" element={<React.Suspense fallback={<LoadingFallback />}><ProgramDetail /></React.Suspense>} />
              <Route path="/programs-hub/:key/participate" element={<React.Suspense fallback={<LoadingFallback />}><ProgramParticipate /></React.Suspense>} />

              {/* Redirect legacy /programs/* to /app/programs/* */}
              <Route path="/programs/*" element={<PrefixRedirect prefix="/app" />} />
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RouterWrapper>
        </>
  );
}

export default App;