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
          <Route path="/dashboard" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
