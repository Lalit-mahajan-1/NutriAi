import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import HowItWorksPage from "./pages/HowItWorksPage";
import MealPlansPage from "./pages/MealPlansPage";
import BudgetPage from "./pages/BudgetPage";
import HealthPage from "./pages/HealthPage";
import DashboardPage from "./pages/DashboardPage";
import AboutPage from "./pages/AboutPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import NutritionHomePage from "./pages/NutritionHomePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Pages that hide the global Navbar/Footer
const NO_LAYOUT_PATHS = ["/", "/login", "/signup"];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const showLayout = !NO_LAYOUT_PATHS.includes(location.pathname);

  return (
    <>
      {showLayout && <Navbar />}
      {children}
      {showLayout && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/"             element={<Home />}           />
              <Route path="/login"        element={<AuthPage />}       />
              <Route path="/signup"       element={<AuthPage />}       />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/meal-plans"   element={<MealPlansPage />}  />
              <Route path="/budget"       element={<BudgetPage />}     />
              <Route path="/health"       element={<HealthPage />}     />
              <Route path="/about"        element={<AboutPage />}      />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home/:userId"
                element={
                  <ProtectedRoute>
                    <NutritionHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;