import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import SectorDetail from "@/pages/sector-detail"; // Keeping it for backward compat or if needed
import MeasurementCampaign from "@/pages/measurement-campaign";
import Report from "@/pages/report";
import NotFound from "@/pages/not-found";

import ClientsPage from "@/pages/clients";
import ReportsList from "@/pages/reports-list";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/reports" component={ReportsList} />
        <Route path="/campaign/:type" component={MeasurementCampaign} />
        <Route path="/sector/:id" component={SectorDetail} />
        <Route path="/report" component={Report} />
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
