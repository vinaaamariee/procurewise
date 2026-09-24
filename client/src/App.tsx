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
import { ForecastPage, NoticesPage, OfficerSettingsPage, SupplierEvaluationsPage, TransmittalsPage } from "./pages/OfficerPages";
import { PrintNoticePage, PrintPreCanvassAbstractPage, PrintTransmittalPage } from "./pages/PrintPages";
import PublicTrackingPage from "./pages/PublicTracking";
import Landing from "./pages/Landing";
import { AnalyticsPage, AuditTrailPage, BudgetPage, PlansPage, SupplierRegistryPage } from "./pages/ManagementPages";
import { BestValuePolicySettingsPage } from "./pages/BestValuePolicySettingsPage";
import { SupplierEvaluationFormPage } from "./pages/SupplierEvaluationFormPage";
import { ExecutionPage, PreCanvassPage } from "./pages/WorkflowPages";
import SetupPage from "./pages/Setup";
import TestRecordManagementPage from "./pages/TestRecordManagement";
import { PurchaseRequestsPage, WorkspacePage } from "./pages/Workspace";
import CatalogPage from "./pages/Catalog";
// Defense workspace — no authentication required
import DemoEntryPage from "./pages/demo/DemoEntry";
import DemoOverviewPage from "./pages/demo/DemoOverview";
import DemoRequestsPage from "./pages/demo/DemoRequests";
import DemoRequestDetailPage from "./pages/demo/DemoRequestDetail";
import { DemoApprovalsPage, DemoAuditPage, DemoGovernancePage, DemoUiKitPage, DemoValidationPage } from "./pages/demo/DemoRouteShells";

function Router() {
  const protectedPage = (page: React.ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/access"} component={Access} />
      <Route path={"/track"} component={PublicTrackingPage} />
      <Route path={"/dashboard"}>{protectedPage(<Dashboard />)}</Route>
      <Route path={"/purchase-requests"}>{protectedPage(<PurchaseRequestsPage />)}</Route>
      <Route path={"/rfq"}>{protectedPage(<PreCanvassPage />)}</Route>
      <Route path={"/purchase-orders"}>{protectedPage(<ExecutionPage />)}</Route>
      <Route path={"/documents"}>{protectedPage(<DocumentsPage />)}</Route>
      <Route path={"/notifications"}>{protectedPage(<NotificationsPage />)}</Route>
      <Route path={"/officer/notices"}>{protectedPage(<NoticesPage />)}</Route>
      <Route path={"/officer/transmittals"}>{protectedPage(<TransmittalsPage />)}</Route>
      <Route path={"/officer/forecast"}>{protectedPage(<ForecastPage />)}</Route>
      <Route path={"/officer/settings"}>{protectedPage(<OfficerSettingsPage />)}</Route>
      <Route path={"/supplier-evaluations"}>{protectedPage(<SupplierEvaluationsPage />)}</Route>
      <Route path={"/supplier-evaluation-form"}>{protectedPage(<SupplierEvaluationFormPage />)}</Route>
      <Route path={"/print/notice"}>{protectedPage(<PrintNoticePage />)}</Route>
      <Route path={"/print/transmittal"}>{protectedPage(<PrintTransmittalPage />)}</Route>
      <Route path={"/print/pre-canvass-abstract"}>{protectedPage(<PrintPreCanvassAbstractPage />)}</Route>
      <Route path={"/plans"}>{protectedPage(<PlansPage />)}</Route>
      <Route path={"/catalog"}>{protectedPage(<CatalogPage />)}</Route>
      <Route path={"/suppliers"}>{protectedPage(<SupplierRegistryPage />)}</Route>
      <Route path={"/budgets"}>{protectedPage(<BudgetPage />)}</Route>
      <Route path={"/analytics"}>{protectedPage(<AnalyticsPage />)}</Route>
      <Route path={"/audit"}>{protectedPage(<AuditTrailPage />)}</Route>
      <Route path={"/setup"}>{protectedPage(<SetupPage />)}</Route>
      <Route path={"/test-records"}>{protectedPage(<TestRecordManagementPage />)}</Route>
      <Route path={"/best-value-policy"}>{protectedPage(<BestValuePolicySettingsPage />)}</Route>
      {/* Defense workspace — no auth required */}
      <Route path={"/demo"} component={DemoEntryPage} />
      <Route path={"/demo/overview"} component={DemoOverviewPage} />
      <Route path={"/demo/requests"} component={DemoRequestsPage} />
      <Route path={"/demo/requests/:id"} component={DemoRequestDetailPage} />
      <Route path={"/demo/approvals"} component={DemoApprovalsPage} />
      <Route path={"/demo/audit"} component={DemoAuditPage} />
      <Route path={"/demo/validation"} component={DemoValidationPage} />
      <Route path={"/demo/governance"} component={DemoGovernancePage} />
      <Route path={"/demo/ui-kit"} component={DemoUiKitPage} />
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

