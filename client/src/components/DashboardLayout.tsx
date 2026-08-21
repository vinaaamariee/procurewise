import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { normalizeProcurementRole, type ProcurementRole } from "../../../shared/procurementRules";
import { Bell, BookOpenText, Boxes, ClipboardList, FileCheck2, FileSearch, FileText, LayoutDashboard, LogOut, Menu, Paperclip, ReceiptText, Search, Settings2, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navigation: Array<{ label: string; path: string; icon: typeof LayoutDashboard; roles: ProcurementRole[] }> = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "PPMP & Purchase Requests", path: "/purchase-requests", icon: ClipboardList, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Pre-Canvass", path: "/rfq", icon: FileSearch, roles: ["end_user", "procurement_officer", "admin"] },
  { label: "Documents", path: "/documents", icon: Paperclip, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Abstracts, PO & PMR", path: "/purchase-orders", icon: FileCheck2, roles: ["procurement_officer", "administrative_approver", "admin"] },
  { label: "PPMP Planning", path: "/plans", icon: BookOpenText, roles: ["end_user", "admin"] },
  { label: "Suppliers", path: "/suppliers", icon: UsersRound, roles: ["procurement_officer", "admin"] },
  { label: "Budget Control", path: "/budgets", icon: WalletCards, roles: ["administrative_approver", "admin"] },
  { label: "Analytics", path: "/analytics", icon: Boxes, roles: ["procurement_officer", "administrative_approver", "admin"] },
  { label: "Audit Trail", path: "/audit", icon: ReceiptText, roles: ["procurement_officer", "administrative_approver", "admin"] },
  { label: "System setup", path: "/setup", icon: Settings2, roles: ["admin"] },
];

const roleLabels: Record<ProcurementRole, string> = { end_user: "End-User", procurement_officer: "Procurement Officer", administrative_approver: "Administrative Approver", admin: "Admin" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const procurementRole = user ? normalizeProcurementRole(user.role) : "end_user";
  const roleLabel = roleLabels[procurementRole];
  const visibleNavigation = navigation.filter((item) => item.roles.includes(procurementRole));
  const handleLogout = async () => { await logout(); setLocation("/access"); };

  if (loading) {
    return <div className="min-h-screen bg-[#f8f7f3]" />;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f7f3] px-5">
        <div className="w-full max-w-md border border-[#e4e1da] bg-white p-8 text-center shadow-[0_12px_36px_rgba(36,42,52,0.08)]">
          <ProcureWiseLogo className="justify-center" />
          <ShieldCheck className="mx-auto mt-8 h-8 w-8 text-[#7b1e1e]" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-[#202833]">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-[#677281]">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Button asChild className="mt-7 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold hover:bg-[#641818]"><Link href="/access">Sign in to ProcureWise</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#202833]">
      <div className="border-b border-[#e4e1da] bg-white">
        <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-4 px-4 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="h-9 w-9 rounded-[4px] lg:hidden" aria-label="Toggle navigation">
            <Menu className="h-4.5 w-4.5" />
          </Button>
          <Link href="/dashboard" className="shrink-0"><ProcureWiseLogo /></Link>
          <div className="mx-auto hidden max-w-md flex-1 lg:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#87909b]" />
              <Input aria-label="Search procurement records" placeholder="Search PR, RFQ, PO, or supplier" className="h-9 rounded-[4px] border-[#e4e1da] bg-[#fbfaf7] pl-9 text-xs shadow-none placeholder:text-[#9aa1aa] focus-visible:ring-[#7b1e1e]" />
            </label>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/notifications")} className="relative h-9 w-9 rounded-[4px]" aria-label="Notifications">
              <Bell className="h-4 w-4 text-[#566171]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#b78327]" />
            </Button>
            <div className="hidden items-center gap-2 border-l border-[#e4e1da] pl-3 sm:flex">
              <Avatar className="h-8 w-8 rounded-[4px] border border-[#e1ddd3]">
                <AvatarFallback className="rounded-[3px] bg-[#f8f1e0] text-[11px] font-bold text-[#7b1e1e]">{user.name?.slice(0, 1).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden xl:block">
                <p className="max-w-[132px] truncate text-xs font-semibold text-[#303946]">{user.name || "Procurement User"}</p>
                <p className="mt-0.5 text-[10px] font-medium text-[#8a6a2e]">{roleLabel}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void handleLogout()} className="h-9 w-9 rounded-[4px] text-[#677281] hover:bg-red-50 hover:text-[#9c2525]" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1560px]">
        <aside className={`fixed inset-x-0 top-16 z-20 border-b border-[#e4e1da] bg-white p-3 lg:static lg:block lg:min-h-[calc(100vh-64px)] lg:w-[236px] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-4 ${menuOpen ? "block" : "hidden"}`}>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9198a1]">Procurement workspace</p>
          <nav className="grid gap-0.5">
            {visibleNavigation.map((item) => {
              const active = location === item.path;
              return (
                <button key={item.path} onClick={() => { setLocation(item.path); setMenuOpen(false); }} className={`flex h-9 items-center gap-2.5 rounded-[4px] px-2.5 text-left text-xs font-medium transition-colors ${active ? "bg-[#f9f1e0] text-[#7b1e1e]" : "text-[#566171] hover:bg-[#f5f3ee] hover:text-[#303946]"}`}>
                  <item.icon className={`h-3.5 w-3.5 ${active ? "text-[#7b1e1e]" : "text-[#7c8795]"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-7 border-t border-[#ece9e2] pt-5">
            <div className="rounded-[4px] border border-[#e7dfce] bg-[#fcfaf4] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">Workflow controls</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[#6a7280]">Actions appear only when your assigned role is permitted to act.</p>
              <Badge variant="outline" className="mt-2 rounded-[3px] border-[#dec99b] bg-white px-1.5 py-0 text-[9px] font-semibold text-[#7b5c20]">ROLE-GATED</Badge>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
