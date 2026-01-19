import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import SectorDetail from "@/pages/sector-detail"; // Keeping it for backward compat or if needed
import MeasurementCampaign from "@/pages/measurement-campaign";
import MeasurementEntry from "@/pages/measurement-entry";
import LightingSheet from "@/pages/lighting-sheet";
import GroundingSelector from "@/pages/grounding-selector";
import GroundingProtocol from "@/pages/grounding-protocol";
import GroundingContinuity from "@/pages/grounding-continuity";
import GroundingElectrical from "@/pages/grounding-electrical";
import Report from "@/pages/report";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

import ClientsPage from "@/pages/clients";
import ReportsList from "@/pages/reports-list";
import BudgetGenerator from "@/pages/budget-generator";

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

import SettingsPage from "@/pages/settings";

import HistoryPage from "@/pages/history";

function Router() {
  const [location] = useLocation();

  if (location === "/login") {
    return <Login />;
  }

  // Fullscreen pages without Layout
  if (location === "/lighting-sheet") {
    return <ProtectedRoute component={LightingSheet} />;
  }
  if (location === "/grounding") {
    return <ProtectedRoute component={GroundingSelector} />;
  }
  if (location === "/grounding/protocol") {
    return <ProtectedRoute component={GroundingProtocol} />;
  }
  if (location === "/grounding/continuity") {
    return <ProtectedRoute component={GroundingContinuity} />;
  }
  if (location === "/grounding/electrical") {
    return <ProtectedRoute component={GroundingElectrical} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/history" component={() => <ProtectedRoute component={HistoryPage} />} />
        <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} adminOnly />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsList} adminOnly />} />
        <Route path="/instruments" component={() => <ProtectedRoute component={InstrumentsPage} />} />
        <Route path="/budget-generator" component={() => <ProtectedRoute component={BudgetGenerator} adminOnly />} />
        <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} adminOnly />} />
        <Route path="/campaign/:type" component={() => <ProtectedRoute component={MeasurementCampaign} />} />
        <Route path="/campaign/:type/entry" component={() => <ProtectedRoute component={MeasurementEntry} />} />
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
