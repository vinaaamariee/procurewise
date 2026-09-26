import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { GlobalAppearanceControls } from "@/components/GlobalAppearanceControls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole, type ProcurementRole } from "../../../shared/procurementRules";
import { Archive, Bell, BookOpenText, Boxes, Building2, ClipboardList, FileCheck2, FileSearch, FileSpreadsheet, FileText, LayoutDashboard, LineChart, LoaderCircle, LogOut, Menu, PackageSearch, Paperclip, ReceiptText, Scale, Search, Send, Settings2, ShieldCheck, Star, UserCog, UsersRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const navigation: Array<{ label: string; path: string; icon: typeof LayoutDashboard; roles: ProcurementRole[] }> = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Procurement Catalog", path: "/catalog", icon: PackageSearch, roles: ["end_user", "procurement_officer", "admin"] },
  { label: "PPMP Planning", path: "/plans", icon: BookOpenText, roles: ["admin"] },
  { label: "PPMP & Purchase Requests", path: "/purchase-requests", icon: ClipboardList, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Suppliers", path: "/suppliers", icon: UsersRound, roles: ["procurement_officer", "admin"] },
  { label: "Pre-Canvass", path: "/rfq", icon: FileSearch, roles: ["end_user"] },
  { label: "Letters of Notice", path: "/officer/notices", icon: FileText, roles: ["procurement_officer", "admin"] },
  { label: "BAC Transmittals", path: "/officer/transmittals", icon: Send, roles: ["procurement_officer", "admin"] },
  { label: "Abstracts, PO & PMR", path: "/purchase-orders", icon: FileCheck2, roles: ["procurement_officer", "administrative_approver", "admin"] },
  { label: "Supplier Evaluation Form", path: "/supplier-evaluation-form", icon: Star, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Documents", path: "/documents", icon: Paperclip, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Budget Control", path: "/budgets", icon: WalletCards, roles: ["administrative_approver", "admin"] },
  { label: "Procurement Forecast", path: "/officer/forecast", icon: LineChart, roles: ["procurement_officer", "admin"] },
  { label: "Analytics", path: "/analytics", icon: Boxes, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Audit Trail", path: "/audit", icon: ReceiptText, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Historical PMR", path: "/pmr-history", icon: ReceiptText, roles: ["procurement_officer", "administrative_approver", "supplier_contractor", "admin"] },
  { label: "Best Value Policy", path: "/best-value-policy", icon: Scale, roles: ["admin"] },
  { label: "System setup", path: "/setup", icon: Settings2, roles: ["admin"] },
  { label: "Forms Hub (Excel)", path: "/form-templates", icon: FileSpreadsheet, roles: ["procurement_officer", "admin"] },
  { label: "Test records", path: "/test-records", icon: Archive, roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedOfficeName, setSelectedOfficeName] = useState(user?.officeName || "");
  const utils = trpc.useUtils();
  const updateMyOfficeMutation = trpc.auth.updateMyOffice.useMutation({
    onSuccess: () => {
      toast.success("Profile office assignment updated.");
      setEditProfileOpen(false);
      void utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const procurementRole = user ? normalizeProcurementRole(user.role) : "end_user";
  const roleLabel = user ? OFFICIAL_ROLE_LABELS[user.role as ProcurementRole] ?? OFFICIAL_ROLE_LABELS[procurementRole] : OFFICIAL_ROLE_LABELS.end_user;
  const visibleNavigation = navigation.filter((item) => item.roles.includes(procurementRole));
  const notifications = trpc.procurement.notifications.list.useQuery(undefined, { retry: false, enabled: Boolean(user), refetchInterval: 15_000, refetchIntervalInBackground: true });
  const unreadCount = notifications.data?.filter((notification) => !notification.readAt).length ?? 0;
  const handleLogout = async () => { await logout(); setLocation("/access"); };

  if (loading) {
    return <div className="min-h-screen bg-[#f8f7f3] dark:bg-[#11161b]" />;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f7f3] px-5 dark:bg-[#11161b]">
        <div className="w-full max-w-md border border-[#e4e1da] bg-white p-8 text-center shadow-[0_12px_36px_rgba(36,42,52,0.08)] dark:border-[#46515c] dark:bg-[#1b2229]">
          <ProcureWiseLogo className="justify-center" />
          <ShieldCheck className="mx-auto mt-8 h-8 w-8 text-[#7b1e1e] dark:text-[#ff837a]" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-[#202833] dark:text-[#f1f5f8]">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-[#677281] dark:text-[#aeb9c4]">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Button asChild className="mt-7 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold text-white hover:bg-[#641818]"><Link href="/access">Sign in to ProcureWise</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f7f3] text-[#202833] dark:bg-[#11161b] dark:text-[#f1f5f8] print:min-h-0 print:bg-white print:p-0 print:m-0">
      <NotificationToastListener />
      <div className="w-full border-b border-[#e4e1da] bg-white dark:border-[#46515c] dark:bg-[#1b2229] print:hidden no-print">
        <div className="mx-auto flex h-16 w-full max-w-[1560px] items-center gap-4 px-4 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="h-9 w-9 rounded-[4px] lg:hidden dark:text-[#d1dae2]" aria-label="Toggle navigation">
            <Menu className="h-4.5 w-4.5" />
          </Button>
          <Link href="/dashboard" className="shrink-0"><ProcureWiseLogo /></Link>
          <div className="mx-auto hidden max-w-md flex-1 lg:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#87909b] dark:text-[#aeb9c4]" />
              <Input aria-label="Search procurement records" placeholder="Search PR, RFQ, PO, or supplier" className="h-9 rounded-[4px] border-[#e4e1da] bg-[#fbfaf7] pl-9 text-xs shadow-none placeholder:text-[#9aa1aa] focus-visible:ring-[#7b1e1e] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] dark:placeholder:text-[#aeb9c4]" />
            </label>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/notifications")} className="relative h-9 w-9 rounded-[4px] text-[#566171] hover:text-[#1f2933] dark:text-[#aeb9c4] dark:hover:text-[#f1f5f8]" aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#7b1e1e] px-1 text-[8px] font-bold leading-none text-white dark:border-[#1b2229]">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </Button>
            <GlobalAppearanceControls />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-9 items-center gap-2 rounded-[4px] px-2 hover:bg-[#f5f3ee] dark:hover:bg-[#232c35]" aria-label="Open account menu">
                  <Avatar className="h-8 w-8 rounded-[4px] border border-[#e1ddd3] dark:border-[#46515c]">
                    <AvatarFallback className="rounded-[3px] bg-[#f8f1e0] text-[11px] font-bold text-[#7b1e1e] dark:bg-[#3d2719] dark:text-[#f0c36a]">{user.name?.slice(0, 1).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[132px] text-left xl:block">
                    <span className="block truncate text-xs font-semibold text-[#303946] dark:text-[#f1f5f8]">{user.name || "Procurement User"}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-[#e4e1da] bg-white dark:border-[#46515c] dark:bg-[#1b2229]">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-semibold text-[#17202a] dark:text-white">{user.name || "Procurement User"}</p>
                  <p className="mt-1 truncate text-xs text-[#52606d] dark:text-[#d1dae2]">{user.email || "Signed-in account"}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</p>
                  {user.officeName && <p className="mt-1 truncate text-[11px] text-[#52606d] dark:text-[#d1dae2]">{user.officeName}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#e4e1da] dark:bg-[#46515c]" />
                <DropdownMenuItem onSelect={() => setEditProfileOpen(true)} className="cursor-pointer">
                  <UserCog className="h-4 w-4 mr-2 text-[#7b1e1e] dark:text-[#ff837a]" />
                  <span>Edit Profile / Department</span>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogContent className="max-w-md border border-border dark:border-[#46515c] dark:bg-[#1b2229]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <UserCog className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" />
                    <span>My Profile & Office Assignment</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Assign your active institutional office or department. This office will be prefilled on your Purchase Requests and procurement forms.
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
                    <p className="mt-1 font-semibold text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</p>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditProfileOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateMyOfficeMutation.isPending}
                    onClick={() => {
                      updateMyOfficeMutation.mutate({ officeName: selectedOfficeName });
                    }}
                    className="bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#9a2828]"
                  >
                    {updateMyOfficeMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save Office Assignment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1560px] min-w-0 overflow-x-hidden print:block print:w-full print:max-w-none print:m-0 print:p-0">
        <aside className={`fixed inset-x-0 top-16 z-20 border-b border-[#e4e1da] bg-white p-3 lg:static lg:block lg:min-h-[calc(100vh-64px)] lg:w-[252px] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-[#e4e1da] lg:p-4 print:hidden no-print dark:border-[#46515c] dark:bg-[#1b2229] ${menuOpen ? "block" : "hidden"}`}>
          <p className="mb-2.5 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[#868f9a] dark:text-[#aeb9c4]">Procurement workspace</p>
          <nav className="grid gap-0.5">
            {visibleNavigation.map((item) => {
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-9.5 items-center gap-2.5 rounded-[4px] px-2.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-[#7b1e1e] pl-3 font-bold text-white shadow-[0_2px_7px_rgba(92,20,20,0.18)] before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-[#d5ab55] dark:bg-[#8f2424] dark:text-white dark:before:bg-[#ffd166]"
                      : "font-medium text-[#566171] hover:bg-[#f5f3ee] hover:text-[#303946] dark:text-[#d1dae2] dark:hover:bg-[#232c35] dark:hover:text-white"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f7d98b] dark:text-[#ffd166]" : "text-[#7c8795] dark:text-[#aeb9c4]"}`} />
                  <span>{procurementRole === "end_user" && item.path === "/analytics" ? "My Analytics" : procurementRole === "end_user" && item.path === "/audit" ? "My Audit Trail" : item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-7 border-t border-[#ece9e2] pt-5 dark:border-[#46515c]">
            <div className="rounded-[4px] border border-[#e7dfce] bg-[#fcfaf4] p-3.5 dark:border-[#635028] dark:bg-[#221c12]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a6d19] dark:text-[#f0c36a]">Workflow controls</p>
              <p className="mt-1.5 text-xs leading-5 text-[#6a7280] dark:text-[#d1dae2]">Actions appear only when your assigned role is permitted to act.</p>
              <Badge variant="outline" className="mt-2 rounded-[3px] border-[#dec99b] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#7b5c20] dark:border-[#806429] dark:bg-[#2b2416] dark:text-[#f0c36a]">ROLE-GATED</Badge>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:p-0 print:m-0 print:w-full print:max-w-none print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
