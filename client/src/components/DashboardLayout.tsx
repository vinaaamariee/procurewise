import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { NotificationCenterDrawer } from "@/components/NotificationCenterDrawer";
import { HelpSupportDialog } from "@/components/HelpSupportDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole, type ProcurementRole, type PersistedUserRole } from "../../../shared/procurementRules";
import {
  Archive, Bell, BookOpenCheck, BookOpenText, Boxes, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, FileCheck2, FileSearch, FileSpreadsheet, FileText,
  LayoutDashboard, LifeBuoy, LineChart, LoaderCircle, LogOut, Menu,
  Moon, PackageSearch, Paperclip, ReceiptText, Scale, Search,
  Send, Settings2, ShieldCheck, Star, Sun, UserCog, UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ─── Navigation registry (strict role-gated per Section 5) ────────────────────
const navigation: Array<{
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: ProcurementRole[];
  category?: string;
}> = [
  // ── Workspace ──
  {
    label: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "workspace",
  },
  {
    label: "Receive & Verify PR/PPMP",
    path: "/officer/pr-verification",
    icon: FileCheck2,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "Distribute & Retrieve RFQ / Transmit to BAC",
    path: "/officer/rfq-distribution",
    icon: Send,
    roles: ["procurement_staff", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "PhilGEPS Posting",
    path: "/officer/philgeps",
    icon: FileSpreadsheet,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "Letters of Notice (Serving)",
    path: "/officer/notices-serving",
    icon: FileText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "processing",
  },
  {
    label: "Purchase Order / Contract Releasing",
    path: "/officer/releasing",
    icon: FileCheck2,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "processing",
  },
  {
    label: "Delivery & Inspection Monitoring",
    path: "/officer/delivery-monitoring",
    icon: Boxes,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "processing",
  },
  {
    label: "Procurement Catalog",
    path: "/catalog",
    icon: PackageSearch,
    // Accessible to PO, Staff, End-User, and Admin
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "workspace",
  },
  {
    label: "PPMP Planning",
    path: "/plans",
    icon: BookOpenText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "PPMP & Purchase Requests",
    path: "/purchase-requests",
    icon: ClipboardList,
    // Strictly End-User only; completely hidden and blocked for Procurement Staff, PO, BAC, Budget Officer, and HoPE
    roles: ["end_user", "admin"],
    category: "workspace",
  },
  {
    label: "PMR Registry",
    path: "/pmr-registry",
    icon: BookOpenCheck,
    roles: ["procurement_staff", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "RFQ Management",
    path: "/rfq-management",
    icon: FileSpreadsheet,
    roles: ["procurement_staff", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "Suppliers",
    path: "/suppliers",
    icon: UsersRound,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "Pre-Canvass",
    path: "/rfq",
    icon: FileSearch,
    // Exclusively visible to End-Users; strictly hidden from all other roles
    roles: ["end_user"],
    category: "workspace",
  },

  // ── Processing ──
  {
    label: "Letters of Notice",
    path: "/officer/notices",
    icon: FileText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "processing",
  },
  {
    label: "BAC Transmittals",
    path: "/officer/transmittals",
    icon: Send,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "bac", "bac_secretariat", "admin"],
    category: "processing",
  },
  {
    label: "Prepare Purchase Order (App. 61)",
    path: "/purchase-orders",
    icon: FileCheck2,
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "processing",
  },
  {
    label: "Supplier Evaluation Form",
    path: "/supplier-evaluation-form",
    icon: Star,
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "processing",
  },
  {
    label: "Documents",
    path: "/documents",
    icon: Paperclip,
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "processing",
  },
  {
    label: "Budget Control",
    path: "/budgets",
    icon: WalletCards,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "budget_officer", "administrative_approver", "admin"],
    category: "processing",
  },

  // ── Reports ──
  {
    label: "Procurement Forecast",
    path: "/officer/forecast",
    icon: LineChart,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "reports",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: Boxes,
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "administrative_approver",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "supplier_contractor",
      "admin",
    ],
    category: "reports",
  },
  {
    label: "Audit Trail",
    path: "/audit",
    icon: ReceiptText,
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "reports",
  },
  {
    label: "Historical PMR",
    path: "/pmr-history",
    icon: ReceiptText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "supplier_contractor", "admin"],
    category: "reports",
  },

  // ── Administration ──
  {
    label: "Best Value Policy",
    path: "/best-value-policy",
    icon: Scale,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "admin",
  },
  {
    label: "Forms Hub (Excel)",
    path: "/form-templates",
    icon: FileSpreadsheet,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "admin",
  },
  {
    label: "System setup",
    path: "/setup",
    icon: Settings2,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "admin",
  },
  {
    label: "Test Records",
    path: "/test-records",
    icon: Archive,
    roles: ["admin"],
    category: "admin",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  workspace:  "Workspace",
  processing: "Processing",
  reports:    "Reports",
  admin:      "Administration",
};

const SIDEBAR_STORAGE_KEY = "procurewise_sidebar_collapsed";

// ─── Inline theme toggle (seamless light/dark transition) ──────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-[#881337]/25 dark:hover:text-[#fda4af] transition-colors"
    >
      {isDark
        ? <Sun  className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedOfficeName, setSelectedOfficeName] = useState(user?.officeName || "");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Collapsible category sections state (all expanded by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (cat: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Hydration-safe sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) setIsCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const utils = trpc.useUtils();
  const updateMyOfficeMutation = trpc.auth.updateMyOffice.useMutation({
    onSuccess: () => {
      toast.success("Profile office assignment updated.");
      setEditProfileOpen(false);
      void utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rawRole = (user?.role || "end_user") as PersistedUserRole;
  const currentRole = (user?.role || "end_user") as ProcurementRole;
  const roleLabel = user
    ? (currentRole === "hope" ? "HoPE (College President)" : OFFICIAL_ROLE_LABELS[currentRole] ?? OFFICIAL_ROLE_LABELS[normalizeProcurementRole(rawRole)] ?? "End-User")
    : OFFICIAL_ROLE_LABELS.end_user;

  // Strict role filter per Section 5 specification & Procurement Staff scoping
  const allVisible = navigation.filter((item) => {
    if (currentRole === "admin") return true;
    if (currentRole === "procurement_staff") {
      const allowedStaffPaths = [
        "/dashboard",
        "/pmr-registry",
        "/rfq-management",
        "/officer/rfq-distribution",
        "/officer/transmittals",
        "/officer/notices",
        "/purchase-orders",
        "/form-templates",
        "/analytics",
      ];
      return allowedStaffPaths.includes(item.path);
    }
    const isOfficer = currentRole === "procurement_officer" || currentRole === "procurement_officer_i" || currentRole === "procurement_officer_ii" || rawRole === "supply_officer";
    if (isOfficer) {
      const allowedOfficerPaths = [
        "/dashboard",
        "/officer/pr-verification",
        "/officer/rfq-distribution",
        "/officer/philgeps",
        "/officer/notices-serving",
        "/officer/releasing",
        "/officer/delivery-monitoring",
        "/supplier-evaluation-form",
        "/budgets",
        "/analytics",
        "/officer/forecast",
        "/audit",
        "/pmr-history",
        "/best-value-policy",
        "/setup",
        "/form-templates",
      ];
      return allowedOfficerPaths.includes(item.path);
    }
    // Block non-End-Users from PPMP-linked PRs
    if (item.path === "/purchase-requests" && currentRole !== "end_user") {
      return false;
    }
    return item.roles.includes(currentRole);
  });

  // Apply role-specific descriptive label overrides
  const getLabel = (item: (typeof navigation)[0]) => {
    if (currentRole === "end_user") {
      if (item.path === "/catalog") return "Browse Items";
      if (item.path === "/purchase-requests") return "My Purchase Requests";
      if (item.path === "/rfq") return "Collect Supplier Quotes";
      if (item.path === "/supplier-evaluation-form") return "Rate a Supplier";
      if (item.path === "/analytics") return "My reports";
      if (item.path === "/audit") return "My Activity";
    }
    if (currentRole === "procurement_officer" || currentRole === "procurement_officer_i" || currentRole === "procurement_officer_ii" || rawRole === "supply_officer") {
      if (item.path === "/dashboard") return "Overview";
      if (item.path === "/officer/pr-verification") return "Receive & Verify PR/PPMP";
      if (item.path === "/officer/rfq-distribution") return "Distribute & Retrieve RFQ / Transmit to BAC";
      if (item.path === "/officer/philgeps") return "PhilGEPS Posting";
      if (item.path === "/officer/notices-serving") return "Letters of Notice (Serving)";
      if (item.path === "/officer/releasing") return "Purchase Order / Contract Releasing";
      if (item.path === "/officer/delivery-monitoring") return "Delivery & Inspection Monitoring";
      if (item.path === "/supplier-evaluation-form") return "Supplier Evaluation Form";
      if (item.path === "/budgets") return "Budget Control";
      if (item.path === "/analytics") return "Reports & Analytics";
      if (item.path === "/officer/forecast") return "Procurement Forecast";
      if (item.path === "/audit") return "Audit Trail";
      if (item.path === "/pmr-history") return "Historical PMR";
      if (item.path === "/best-value-policy") return "Best Value Policy";
      if (item.path === "/setup") return "System Setup";
      if (item.path === "/form-templates") return "Documents & Forms Hub";
    }
    if (currentRole === "procurement_staff") {
      if (item.path === "/dashboard") return "Overview";
      if (item.path === "/pmr-registry") return "PMR Registry";
      if (item.path === "/rfq-management") return "RFQ & Supplier Quotations";
      if (item.path === "/officer/rfq-distribution") return "Forward to BAC for AOQ";
      if (item.path === "/officer/transmittals") return "BAC Transmittals Register";
      if (item.path === "/officer/notices") return "Letters of Notice";
      if (item.path === "/purchase-orders") return "Prepare Purchase Order";
      if (item.path === "/form-templates") return "Documents & Forms Hub";
    }
    if (currentRole === "hope") {
      if (item.path === "/dashboard") return "Overview (Executive metrics & sign-off)";
      if (item.path === "/purchase-orders") return "Contract Signing (Purchase Orders)";
    }
    if (currentRole === "bac" || currentRole === "bac_secretariat") {
      if (item.path === "/officer/transmittals") return "BAC Resolutions & Transmittals (ABC & Endorsement)";
      if (item.path === "/purchase-orders") return "Purchase Orders & Quotation Abstracts";
    }
    if (currentRole === "budget_officer") {
      if (item.path === "/budgets") return "Budget Control (Allotment & funds certification)";
      if (item.path === "/purchase-orders") return "Funds Clearance & PO Signing";
    }
    return item.label;
  };

  const visibleNavigation = allVisible.filter((item) => {
    if (!searchQuery.trim()) return true;
    return getLabel(item).toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group by category for section headers
  const grouped = visibleNavigation.reduce<Record<string, typeof visibleNavigation>>((acc, item) => {
    const cat = item.category ?? "workspace";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const notifications = trpc.procurement.notifications.list.useQuery(undefined, {
    retry: false, enabled: Boolean(user), refetchInterval: 15_000, refetchIntervalInBackground: true,
  });
  const unreadCount = notifications.data?.filter((n) => !n.readAt).length ?? 0;
  const handleLogout = async () => { await logout(); setLocation("/access"); };

  const userInitials = (user?.name || "U").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-[#090d16]" />;

  // ── Unauthenticated guard ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#090d16] px-5 transition-colors">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          {/* Institutional BSC Logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#d2b058]/50 bg-white p-1 shadow-md">
            <img src="/bsc-logo.jpg" alt="Batanes State College" className="h-full w-full rounded-xl object-contain" />
          </div>
          <ShieldCheck className="mx-auto mt-6 h-8 w-8 text-[#881337] dark:text-[#fda4af]" />
          <h1 className="mt-4 font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900 dark:text-white">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Link
            href="/access"
            className="mt-7 flex h-11 w-full items-center justify-center rounded-xl bg-[#881337] text-sm font-semibold text-white shadow-lg shadow-[#881337]/30 transition hover:bg-[#9f1239]"
          >
            Sign in to ProcureWise
          </Link>
        </div>
      </div>
    );
  }

  // ── Sidebar nav item ───────────────────────────────────────────────────────
  // ── Sidebar nav item ───────────────────────────────────────────────────────
  const NavItem = ({ item }: { item: (typeof navigation)[0] }) => {
    const label = getLabel(item);
    const active = location === item.path;

    const btn = (
      <button
        key={item.path}
        type="button"
        onClick={() => { setLocation(item.path); setMenuOpen(false); }}
        aria-current={active ? "page" : undefined}
        style={active ? { boxShadow: "0 0 14px rgba(136,19,55,0.22)" } : undefined}
        className={[
          "group relative transition-all duration-150",
          isCollapsed
            ? "w-full flex justify-center items-center px-0 my-2 rounded-xl py-2"
            : "flex w-full items-center rounded-xl py-2 px-3 gap-2.5 text-left",
          active
            ? "border border-[#881337]/30 dark:border-[#881337]/50 bg-[#881337]/10 dark:bg-[#881337]/25 text-[#881337] dark:text-white font-semibold before:bg-[#d5ab55]"
            : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
        ].join(" ")}
      >
        {/* Active top accent hairline */}
        {active && (
          <span
            className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full before:bg-[#d5ab55]"
            style={{ background: "linear-gradient(90deg, transparent, #e11d48, transparent)" }}
          />
        )}

        {/* Icon container */}
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            isCollapsed ? "mx-auto" : "",
            active
              ? "bg-[#881337]/15 dark:bg-[#881337]/35 text-[#881337] dark:text-[#fda4af]"
              : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 group-hover:text-slate-800 dark:group-hover:text-slate-200",
          ].join(" ")}
        >
          <item.icon className="h-4 w-4" />
        </span>

        {!isCollapsed && (
          <span className="sidebar-nav-label flex-1 min-w-0 text-left font-medium leading-snug break-words">
            {label}
          </span>
        )}
      </button>
    );

    return isCollapsed ? (
      <Tooltip key={item.path} delayDuration={50}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs font-medium text-slate-800 dark:text-slate-200 shadow-md z-50">
          {label}
        </TooltipContent>
      </Tooltip>
    ) : (
      <div key={item.path}>{btn}</div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground transition-colors duration-200 print:bg-white">
      <NotificationToastListener />

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur px-4 lg:hidden print:hidden transition-colors"
      >
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
          <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-md object-contain" />
        </div>
        <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-slate-900 dark:text-white">ProcureWise</span>

        <div className="ml-auto flex items-center gap-2">
          <NotificationCenterDrawer triggerVariant="minimal" />
          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] text-slate-800 dark:text-slate-200 pt-14 transition-transform duration-300 lg:hidden print:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: 296 }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-850 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#881337]"
            />
          </div>
          <MobileNavContent
            grouped={grouped}
            getLabel={getLabel}
            location={location}
            setLocation={setLocation}
            setMenuOpen={setMenuOpen}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
          />
        </div>
        <MobileProfileFooter
          user={user}
          userInitials={userInitials}
          roleLabel={roleLabel}
          onEditProfile={() => { setEditProfileOpen(true); setMenuOpen(false); }}
          onLogout={() => void handleLogout()}
        />
      </aside>

      {/* ── Full layout: sidebar + main ──────────────────────────────────── */}
      <div className="flex min-h-screen">

        {/* ── DESKTOP SIDEBAR CONTAINER ────────────────────────────────────── */}
        <div className="relative shrink-0 hidden lg:block sticky top-0 h-screen max-h-screen z-20 print:hidden no-print">
          <aside
            className={[
              "sidebar-rail flex flex-col justify-between h-screen max-h-screen overflow-hidden border-r transition-all duration-300 ease-in-out",
              "bg-white dark:bg-[#0c1322] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200",
              isCollapsed ? "w-[72px]" : "w-64",
            ].join(" ")}
          >
            {/* ── Header Section (Top) ── */}
            {isCollapsed ? (
              <div className="flex h-16 w-full shrink-0 items-center justify-center border-b border-slate-200 dark:border-slate-800">
                <div className="mx-auto my-3 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
                  <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-lg object-contain" />
                </div>
              </div>
            ) : (
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
                    <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-lg object-contain" />
                  </div>
                  <div>
                    <p className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900 dark:text-white leading-tight">ProcureWise</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <NotificationCenterDrawer triggerVariant="minimal" />
                  <ThemeToggle />
                </div>
              </div>
            )}

            {/* ── Search (expanded only) ── */}
            {!isCollapsed && (
              <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search menu…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/50 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#881337]"
                  />
                </div>
              </div>
            )}

            {/* ── Navigation Links Area (Middle - ONLY scrollable section) ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full overflow-x-hidden">
              {Object.entries(grouped).map(([cat, items]) => {
                const isSectionCollapsed = Boolean(collapsedSections[cat]);
                return (
                  <div key={cat} className={isCollapsed ? "mb-1" : "mb-3"}>
                    {!isCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleSection(cat)}
                        aria-expanded={!isSectionCollapsed}
                        className="group mb-1.5 flex w-full items-center justify-between px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                        <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            isSectionCollapsed ? "-rotate-90" : "rotate-0"
                          }`}
                        />
                      </button>
                    )}
                    {(!isSectionCollapsed || isCollapsed) && (
                      <nav className="grid gap-0.5 transition-all">
                        {items.map((item) => <NavItem key={item.path} item={item} />)}
                      </nav>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Bottom pinned section (Footer & Profile) ── */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 bg-inherit space-y-2">
              {/* Help & Support row */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                    <LifeBuoy className="h-4 w-4" />
                  </span>
                  <span className="sidebar-nav-label flex-1 truncate">Help &amp; Support</span>
                </button>
              ) : (
                <Tooltip delayDuration={50}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      aria-label="Help & Support"
                    >
                      <LifeBuoy className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs text-slate-800 dark:text-slate-200 shadow-md z-50">
                    Help &amp; Support
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Pinned profile card */}
              {isCollapsed ? (
                <div className="flex justify-center items-center py-1">
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setEditProfileOpen(true)}
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30 transition hover:ring-[#881337]/60"
                        title="Edit profile"
                      >
                        <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs text-slate-800 dark:text-slate-200 shadow-md z-50">
                      <p className="font-semibold">{user.name || "Procurement User"}</p>
                      <p className="text-[#881337] dark:text-[#fda4af] text-[10px]">{roleLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#121826] p-2.5 transition-colors">
                  {/* Avatar */}
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30 transition hover:ring-[#881337]/60"
                    title="Edit profile"
                  >
                    <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
                  </button>

                  {/* Name + role */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100">
                      {user.name || "Procurement User"}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[#881337] dark:text-[#fda4af] font-medium mt-0.5">{roleLabel}</p>
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    aria-label="Sign out"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400"
                    title="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ── Centered Pull-Tab Sidebar Toggle ("Folder Tab" Style) ── */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-40 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            )}
          </button>
        </div>

        {/* ── Main content (proper padding & breathing room) ────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out">
          <main className="min-w-0 flex-1 overflow-x-auto pt-20 lg:pt-10 px-4 sm:px-6 md:px-8 pb-12 print:p-0 transition-all duration-300 ease-in-out">
            <div className="mx-auto w-full max-w-[1440px]">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ── Edit Profile Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCog className="h-4 w-4 text-primary" />
              <span>My Profile &amp; Office Assignment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign your active institutional office or department. This office will be prefilled on Purchase Requests and procurement forms.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground">Full Name</label>
              <p className="mt-1 font-medium text-foreground">{user.name || "Procurement User"}</p>
            </div>
            <div>
              <label className="font-semibold text-foreground">Account Email</label>
              <p className="mt-1 text-muted-foreground">{user.email || "—"}</p>
            </div>
            <div>
              <label className="font-semibold text-foreground">Workflow Role</label>
              <p className="mt-1 font-semibold text-[#881337] dark:text-[#fda4af]">{roleLabel}</p>
            </div>
            <div>
              <label htmlFor="user-office-select" className="font-semibold text-foreground">Assigned Office / Unit</label>
              <div className="mt-1.5">
                <OfficeSelect
                  id="user-office-select"
                  value={selectedOfficeName}
                  valueMode="name"
                  onChange={setSelectedOfficeName}
                  placeholder="Search & select your institutional office..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditProfileOpen(false)} className="text-xs">Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={updateMyOfficeMutation.isPending}
              onClick={() => updateMyOfficeMutation.mutate({ officeName: selectedOfficeName })}
              className="bg-[#881337] text-xs text-white hover:bg-[#70102b]"
            >
              {updateMyOfficeMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Office Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Decoupled Help & Support Center Dialog ─────────────────────────── */}
      <HelpSupportDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

// ─── Mobile-only nav content (with collapsible categories) ───────────────────
function MobileNavContent({
  grouped, getLabel, location, setLocation, setMenuOpen, collapsedSections, toggleSection,
}: {
  grouped: Record<string, typeof navigation>;
  getLabel: (item: (typeof navigation)[0]) => string;
  location: string;
  setLocation: (path: string) => void;
  setMenuOpen: (open: boolean) => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (cat: string) => void;
}) {
  return (
    <>
      {Object.entries(grouped).map(([cat, items]) => {
        const isSectionCollapsed = Boolean(collapsedSections[cat]);
        return (
          <div key={cat} className="mb-4">
            <button
              type="button"
              onClick={() => toggleSection(cat)}
              className="mb-1.5 flex w-full items-center justify-between px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <span>{CATEGORY_LABELS[cat] ?? cat}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  isSectionCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              />
            </button>
            {!isSectionCollapsed && (
              <nav className="grid gap-0.5">
                {items.map((item) => {
                  const label = getLabel(item);
                  const active = location === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                      aria-current={active ? "page" : undefined}
                      style={active ? { boxShadow: "0 0 14px rgba(136,19,55,0.22)" } : undefined}
                      className={[
                        "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all",
                        active
                          ? "border border-[#881337]/30 dark:border-[#881337]/50 bg-[#881337]/10 dark:bg-[#881337]/25 text-[#881337] dark:text-white font-semibold before:bg-[#d5ab55]"
                          : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
                      ].join(" ")}
                    >
                      {active && (
                        <span
                          className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full before:bg-[#d5ab55]"
                          style={{ background: "linear-gradient(90deg, transparent, #e11d48, transparent)" }}
                        />
                      )}
                      <span className={[
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active ? "bg-[#881337]/15 dark:bg-[#881337]/35 text-[#881337] dark:text-[#fda4af]" : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 group-hover:text-slate-800 dark:group-hover:text-slate-200",
                      ].join(" ")}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="sidebar-nav-label flex-1 min-w-0 text-left font-medium leading-snug break-words">{label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Mobile profile footer ────────────────────────────────────────────────────
function MobileProfileFooter({
  user, userInitials, roleLabel, onEditProfile, onLogout,
}: {
  user: { name?: string | null; email?: string | null };
  userInitials: string;
  roleLabel: string;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-800/80 p-3 bg-slate-50/80 dark:bg-[#0c1322]">
      <div
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-[#121826] transition-colors"
      >
        <button
          type="button"
          onClick={onEditProfile}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30"
        >
          <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{user.name || "Procurement User"}</p>
          <p className="truncate text-[10px] text-[#881337] dark:text-[#fda4af] font-medium">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
