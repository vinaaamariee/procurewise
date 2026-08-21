import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Access from "./pages/Access";
import DocumentsPage from "./pages/Documents";
import NotificationsPage from "./pages/Notifications";
import Landing from "./pages/Landing";
import { AnalyticsPage, AuditTrailPage, BudgetPage, PlansPage, SupplierRegistryPage } from "./pages/ManagementPages";
import { ExecutionPage, PreCanvassPage } from "./pages/WorkflowPages";
import SetupPage from "./pages/Setup";
import { PurchaseRequestsPage, WorkspacePage } from "./pages/Workspace";

function Router() {
  const protectedPage = (page: React.ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/access"} component={Access} />
      <Route path={"/dashboard"}>{protectedPage(<Dashboard />)}</Route>
      <Route path={"/purchase-requests"}>{protectedPage(<PurchaseRequestsPage />)}</Route>
      <Route path={"/rfq"}>{protectedPage(<PreCanvassPage />)}</Route>
      <Route path={"/purchase-orders"}>{protectedPage(<ExecutionPage />)}</Route>
      <Route path={"/documents"}>{protectedPage(<DocumentsPage />)}</Route>
      <Route path={"/notifications"}>{protectedPage(<NotificationsPage />)}</Route>
      <Route path={"/plans"}>{protectedPage(<PlansPage />)}</Route>
      <Route path={"/suppliers"}>{protectedPage(<SupplierRegistryPage />)}</Route>
      <Route path={"/budgets"}>{protectedPage(<BudgetPage />)}</Route>
      <Route path={"/analytics"}>{protectedPage(<AnalyticsPage />)}</Route>
      <Route path={"/audit"}>{protectedPage(<AuditTrailPage />)}</Route>
      <Route path={"/setup"}>{protectedPage(<SetupPage />)}</Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
