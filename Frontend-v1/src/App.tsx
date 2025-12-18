import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./auth/PrivateRoute";
import Login from "./pages/Login";
import { AuthProvider } from "./auth/AuthContext";
import LoginSuccess from "./pages/LoginSuccess";

const queryClient = new QueryClient();

const App = () => (
    <GoogleOAuthProvider clientId="261354622966-duscjimukfhgqlbpkv25jit84r0pikvh.apps.googleusercontent.com">
    <Toaster />
    <AuthProvider>
      <Sonner />
        <Routes>
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>}  />
          <Route path="/login" element={<Login />} />
          <Route path="/login/success" element={<LoginSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </AuthProvider>
  </GoogleOAuthProvider>
);

export default App;
