import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import SectorDetail from "@/pages/sector-detail"; // Keeping it for backward compat or if needed
import MeasurementCampaign from "@/pages/measurement-campaign";
import Report from "@/pages/report";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

import ClientsPage from "@/pages/clients";
import ReportsList from "@/pages/reports-list";

import InstrumentsPage from "@/pages/instruments";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const [location, setLocation] = useLocation();
  const user = useAuth((state) => state.user);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (adminOnly && user.role !== 'admin') {
      setLocation("/");
    }
  }, [user, location, setLocation, adminOnly]);

  if (!user) return null;
  if (adminOnly && user.role !== 'admin') return null;

  return <Component />;
}

function Router() {
  const [location] = useLocation();

  if (location === "/login") {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} adminOnly />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsList} adminOnly />} />
        <Route path="/instruments" component={() => <ProtectedRoute component={InstrumentsPage} />} />
        <Route path="/campaign/:type" component={() => <ProtectedRoute component={MeasurementCampaign} />} />
        <Route path="/sector/:id" component={() => <ProtectedRoute component={SectorDetail} />} />
        <Route path="/report" component={() => <ProtectedRoute component={Report} adminOnly />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
