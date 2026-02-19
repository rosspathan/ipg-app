// Central route configuration with typed routing
export const ROUTES = {
  // Public routes
  HOME: '/',
  
  // Onboarding
  ONBOARDING: '/onboarding',
  WELCOME: '/welcome',
  SECURITY_SETUP: '/security-setup',
  
  // User app stack (/app/*)
  APP: '/app',
  APP_HOME: '/app/home',
  APP_WALLET: '/app/wallet',
  APP_WALLET_HOME: '/app/wallet/home',
  APP_WALLET_CREATE: '/app/wallet/create',
  APP_WALLET_IMPORT: '/app/wallet/import',
  APP_WALLET_SELECTION: '/app/wallet/selection',
  
  APP_MARKETS: '/app/markets',
  APP_MARKET_DETAIL: '/app/markets/:symbol',
  
  APP_TRADE: '/app/trade',
  APP_TRADE_PAIR: '/app/trade/:pair',
  
  APP_SWAP: '/app/swap',
  APP_PROGRAMS: '/app/programs',
  APP_ADVERTISING: '/app/programs/advertising',
  APP_STAKING: '/app/staking',
  APP_STAKING_DETAIL: '/app/staking/:id',
  APP_STAKING_SUBMIT: '/app/staking/:poolId/submit',
  
  APP_PROFILE: '/app/profile',
  APP_SETTINGS: '/app/settings',
  APP_NOTIFICATIONS: '/app/notifications',
  APP_SUPPORT: '/app/support',
  APP_SUPPORT_TICKET: '/app/support/:ticketId',
  
  // Financial operations
  DEPOSIT: '/app/deposit',
  DEPOSIT_INR: '/app/deposit/inr',
  WITHDRAW: '/app/withdraw',
  WITHDRAW_INR: '/app/withdraw/inr',
  SEND: '/app/send',
  TRANSFER: '/app/transfer',
  
  // Programs & Games
  SPIN: '/app/spin',
  SPIN_HISTORY: '/app/spin/history',
  LUCKY_DRAW: '/app/lucky',
  INSURANCE: '/app/insurance',
  GAMIFICATION: '/app/gamification',
  
  // Referrals
  REFERRALS: '/app/referrals',
  REFERRAL_PROGRAM: '/app/referral-program',
  TEAM_REFERRALS: '/app/programs/team-referrals',
  TEAM_REFERRALS_TEAM: '/app/programs/team-referrals/team',
  TEAM_REFERRALS_EARNINGS: '/app/programs/team-referrals/earnings',
  VIP_MILESTONE_HISTORY: '/app/programs/team-referrals/vip-milestone-history',
  
  // KYC & Verification
  KYC: '/app/kyc',
  EMAIL_VERIFICATION: '/app/verify-email',
  EMAIL_VERIFIED: '/app/email-verified',
  
  // History
  HISTORY: '/app/history',
  ORDER_CONFIRMATION: '/app/order/:orderId',
  TRADE_RECEIPT: '/app/trade/:tradeId',
  
  // Admin stack (/admin/*) - Nova DS
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_LOGIN: '/admin/login',
  
  // Nova DS Admin Routes (Phase 1)
  ADMIN_CATALOG: '/admin/catalog',
  ADMIN_PROGRAMS_NOVA: '/admin/programs',
  ADMIN_SETTINGS: '/admin/settings',
  
  // Legacy Admin Routes
  ADMIN_LEGACY: '/admin-legacy',
  
  ADMIN_USERS: '/admin/users',
  ADMIN_ASSETS: '/admin/assets',
  ADMIN_MARKETS: '/admin/markets',
  ADMIN_MARKETS_DETAIL: '/admin/markets/:symbol',
  
  ADMIN_FEES: '/admin/fees',
  ADMIN_FUNDING: '/admin/funding',
  ADMIN_INR_FUNDING: '/admin/funding/inr',
  
  ADMIN_ADS: '/admin/ads',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_SUPPORT: '/admin/support',
  ADMIN_SUPPORT_TICKET: '/admin/support/:ticketId',
  
  ADMIN_PROGRAMS: '/admin/programs',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_REFERRALS: '/admin/referrals',
  ADMIN_REFERRAL_PROGRAM: '/admin/referral-program',
  ADMIN_SPIN: '/admin/spin',
  ADMIN_SPIN_SETTINGS: '/admin/spin-settings',
  ADMIN_PURCHASE_BONUS: '/admin/purchase-bonus',
  ADMIN_INSURANCE: '/admin/insurance',
  ADMIN_INSURANCE_CLAIMS: '/admin/insurance/claims',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_MARKET_FEED: '/admin/market-feed',
  ADMIN_CREDENTIALS_TEST: '/admin/test',
  
  // Currency Management
  ADMIN_CURRENCY_CONTROL: '/admin/currency',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  ADMIN_USER_FINANCIAL: '/admin/users/financial',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ANALYTICS: '/admin/analytics',
  
  // Special routes
  APP_LOCK: '/app/lock',
  NOT_FOUND: '/404',
  SPLASH: '/splash'
} as const;

// Route aliases for common navigation
export const ROUTE_ALIASES = {
  '/app': '/app/home',
  '/admin': '/admin/dashboard',
  '/wallet': '/app/wallet/home',
  '/markets': '/app/markets',
  '/trade': '/app/trade',
  '/profile': '/app/profile'
} as const;

// Define route parameters types
export interface RouteParams {
  [ROUTES.APP_MARKET_DETAIL]: { symbol: string };
  [ROUTES.APP_TRADE_PAIR]: { pair: string };
  [ROUTES.APP_STAKING_DETAIL]: { id: string };
  [ROUTES.APP_SUPPORT_TICKET]: { ticketId: string };
  [ROUTES.ORDER_CONFIRMATION]: { orderId: string };
  [ROUTES.TRADE_RECEIPT]: { tradeId: string };
  [ROUTES.ADMIN_MARKETS_DETAIL]: { symbol: string };
  [ROUTES.ADMIN_SUPPORT_TICKET]: { ticketId: string };
}

// Stack definitions
export const USER_STACK_ROUTES = [
  ROUTES.APP,
  ROUTES.APP_HOME,
  ROUTES.APP_WALLET,
  ROUTES.APP_WALLET_HOME,
  ROUTES.APP_WALLET_CREATE,
  ROUTES.APP_WALLET_IMPORT,
  ROUTES.APP_WALLET_SELECTION,
  ROUTES.APP_MARKETS,
  ROUTES.APP_MARKET_DETAIL,
  ROUTES.APP_TRADE,
  ROUTES.APP_TRADE_PAIR,
  ROUTES.APP_SWAP,
  ROUTES.APP_PROGRAMS,
  ROUTES.APP_STAKING,
  ROUTES.APP_STAKING_DETAIL,
  ROUTES.APP_PROFILE,
  ROUTES.APP_SETTINGS,
  ROUTES.APP_NOTIFICATIONS,
  ROUTES.APP_SUPPORT,
  ROUTES.APP_SUPPORT_TICKET,
  ROUTES.DEPOSIT,
  ROUTES.DEPOSIT_INR,
  ROUTES.WITHDRAW,
  ROUTES.WITHDRAW_INR,
  ROUTES.SEND,
  ROUTES.TRANSFER,
  ROUTES.SPIN,
  ROUTES.SPIN_HISTORY,
  ROUTES.LUCKY_DRAW,
  ROUTES.INSURANCE,
  ROUTES.GAMIFICATION,
  ROUTES.REFERRALS,
  ROUTES.REFERRAL_PROGRAM,
  ROUTES.KYC,
  ROUTES.HISTORY,
  ROUTES.ORDER_CONFIRMATION,
  ROUTES.TRADE_RECEIPT,
  ROUTES.APP_LOCK
] as const;

export const ADMIN_STACK_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_ASSETS,
  ROUTES.ADMIN_MARKETS,
  ROUTES.ADMIN_MARKETS_DETAIL,
  ROUTES.ADMIN_FEES,
  ROUTES.ADMIN_FUNDING,
  ROUTES.ADMIN_INR_FUNDING,
  ROUTES.ADMIN_ADS,
  ROUTES.ADMIN_NOTIFICATIONS,
  ROUTES.ADMIN_SUPPORT,
  ROUTES.ADMIN_SUPPORT_TICKET,
  ROUTES.ADMIN_PROGRAMS,
  ROUTES.ADMIN_SUBSCRIPTIONS,
  ROUTES.ADMIN_REFERRALS,
  ROUTES.ADMIN_REFERRAL_PROGRAM,
  ROUTES.ADMIN_SPIN,
  ROUTES.ADMIN_SPIN_SETTINGS,
  ROUTES.ADMIN_PURCHASE_BONUS,
  ROUTES.ADMIN_INSURANCE,
  ROUTES.ADMIN_INSURANCE_CLAIMS,
  ROUTES.ADMIN_SYSTEM,
  ROUTES.ADMIN_MARKET_FEED,
  ROUTES.ADMIN_CREDENTIALS_TEST,
  ROUTES.ADMIN_CURRENCY_CONTROL,
  ROUTES.ADMIN_TRANSACTIONS,
  ROUTES.ADMIN_USER_FINANCIAL
] as const;

export const AUTH_STACK_ROUTES = [
  ROUTES.ONBOARDING,
  ROUTES.WELCOME,
  ROUTES.SECURITY_SETUP,
  ROUTES.EMAIL_VERIFICATION,
  ROUTES.EMAIL_VERIFIED
] as const;

// Bottom tab routes for user app
export const USER_TAB_ROUTES = [
  { route: ROUTES.APP_HOME, label: 'Home', icon: 'Home' },
  { route: ROUTES.APP_WALLET, label: 'Wallet', icon: 'Wallet' },
  { route: ROUTES.APP_TRADE, label: 'Trading', icon: 'TrendingUp' },
  { route: ROUTES.APP_SWAP, label: 'Swap', icon: 'ArrowUpDown' },
  { route: ROUTES.APP_PROGRAMS, label: 'Programs', icon: 'Gift' },
  { route: ROUTES.APP_PROFILE, label: 'Profile', icon: 'User' }
] as const;

// Deep link patterns
export const DEEP_LINK_PATTERNS = {
  'app://trade/:pair': ROUTES.APP_TRADE_PAIR,
  'app://deposit/:asset?/:network?': ROUTES.DEPOSIT,
  'app://withdraw/:asset?': ROUTES.WITHDRAW,
  'app://profile': ROUTES.APP_PROFILE,
  'app://spin': ROUTES.SPIN,
  'app://ads': ROUTES.ADMIN_ADS,
  'admin://assets': ROUTES.ADMIN_ASSETS,
  'admin://markets/:symbol?': ROUTES.ADMIN_MARKETS,
  'admin://fees': ROUTES.ADMIN_FEES
} as const;

// Navigation history state interface
export interface NavigationState {
  lastSelectedPair?: string;
  lastMarketFilter?: string;
  formData?: Record<string, any>;
  scrollPosition?: number;
  tabState?: Record<string, any>;
  timestamp?: number;
  previousPath?: string;
}

export type RouteKey = keyof typeof ROUTES;
export type StackType = 'USER' | 'ADMIN' | 'AUTH' | 'PUBLIC';