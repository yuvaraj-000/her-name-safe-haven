import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthorityProvider } from "@/contexts/AuthorityContext";
import { SOSProvider } from "@/contexts/SOSContext";
import SOSActiveBanner from "@/components/SOSActiveBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAuthorityRoute from "@/components/authority/ProtectedAuthorityRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthorityLogin from "./pages/AuthorityLogin";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";
import SOS from "./pages/SOS";
import Report from "./pages/Report";
import Contacts from "./pages/Contacts";
import EvidenceVault from "./pages/EvidenceVault";
import SafetyMap from "./pages/SafetyMap";
import CaseTracking from "./pages/CaseTracking";
import CaseChat from "./pages/CaseChat";
import Helplines from "./pages/Helplines";
import Profile from "./pages/Profile";
import UserChat from "./pages/UserChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SOSProvider>
            <SOSActiveBanner />
            <AuthorityProvider>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/authority" element={<AuthorityLogin />} />
              <Route path="/authority/dashboard" element={<ProtectedAuthorityRoute><AuthorityDashboard /></ProtectedAuthorityRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/sos" element={<ProtectedRoute><SOS /></ProtectedRoute>} />
              <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
              <Route path="/vault" element={<ProtectedRoute><EvidenceVault /></ProtectedRoute>} />
              <Route path="/safety-map" element={<ProtectedRoute><SafetyMap /></ProtectedRoute>} />
              <Route path="/cases" element={<ProtectedRoute><CaseTracking /></ProtectedRoute>} />
              <Route path="/cases/:id/chat" element={<ProtectedRoute><CaseChat /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><UserChat /></ProtectedRoute>} />
              <Route path="/helplines" element={<ProtectedRoute><Helplines /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthorityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
