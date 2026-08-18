import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, CircleDollarSign, FileCheck2, FileText, Timer } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const data = dashboard.data;
  const cards = [
    { label: "Purchase Requests", icon: FileText, value: data?.purchaseRequests.length, detail: "PR records visible to your role.", tone: "text-[#7b1e1e] bg-[#fff4f1]", href: "/purchase-requests" },
    { label: "RFQs & Canvass", icon: FileCheck2, value: data?.rfqs.length, detail: "RFQ records available for processing.", tone: "text-[#325d91] bg-[#f1f6fc]", href: "/rfq" },
    { label: "Purchase Orders", icon: CircleDollarSign, value: data?.purchaseOrders.length, detail: "Generated PO records in the workflow.", tone: "text-[#9a6d19] bg-[#fff8e8]", href: "/purchase-orders" },
    { label: "Audit events", icon: Timer, value: data?.auditEvents.length, detail: "Accountability records available to your role.", tone: "text-[#276a4e] bg-[#f1f9f4]", href: "/audit" },
  ];
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Control center" title="Procurement overview" description="A role-sensitive view of requests, quotations, purchase orders, budgets, and accountability records." />
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Link key={card.label} href={card.href} className="flat-panel group p-4 transition-colors hover:border-[#d2bd92]"><div className="flex items-start justify-between"><div className={`grid h-8 w-8 place-items-center rounded-[4px] ${card.tone}`}><card.icon className="h-4 w-4" /></div><ArrowUpRight className="h-3.5 w-3.5 text-[#a1a7ae] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-4 font-display text-2xl font-semibold text-[#202833]">{dashboard.isLoading ? "—" : card.value ?? 0}</p><p className="mt-2 text-xs font-semibold text-[#3b4654]">{card.label}</p><p className="mt-2 text-[11px] leading-5 text-[#718]">{card.detail}</p></Link>)}</div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">{data?.purchaseRequests.length ? <div className="flat-panel"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold text-[#34404e]">Active Purchase Requests</p><p className="mt-1 text-[11px] text-[#7d8793]">Live records routed through the role-gated workflow.</p></div><div className="divide-y divide-[#f0ede6] px-5">{data.purchaseRequests.slice(0, 4).map((pr) => <div key={pr.id} className="flex items-center justify-between gap-3 py-4"><div><p className="text-xs font-semibold text-[#3e4855]">{pr.prNumber}</p><p className="mt-1 max-w-[480px] truncate text-[11px] text-[#77818d]">{pr.purpose}</p></div><StatusBadge tone={pr.status.includes("review") ? "pending" : pr.status === "approved" ? "approved" : "draft"}>{pr.status.replaceAll("_", " ").toUpperCase()}</StatusBadge></div>)}</div></div> : <EmptyWorkspace eyebrow="Action queue" title="There are no workflow actions awaiting your role." description="Requests and approvals requiring your authority will appear here as transactions are submitted and routed." actionLabel="Create purchase request" actionHref="/purchase-requests" />}
      <div className="flat-panel h-fit"><div className="flex items-center justify-between border-b border-[#ece8df] px-5 py-4"><div><p className="text-xs font-semibold text-[#34404e]">Process integrity</p><p className="mt-1 text-[11px] text-[#7d8793]">Mandatory controls for every transaction</p></div><Activity className="h-4 w-4 text-[#7b1e1e]" /></div><div className="divide-y divide-[#f0ede6] px-5 py-1">{["PRs require a valid office and object of expenditure.", "RFQs require three supplier quotations before abstracting.", "POs may be issued only after compliant selection and approval."].map((item, index) => <div key={item} className="flex gap-3 py-4"><StatusBadge tone={index === 1 ? "pending" : "approved"}>{index === 1 ? "CANVASS" : "CONTROL"}</StatusBadge><p className="text-[11px] leading-5 text-[#65707e]">{item}</p></div>)}</div></div>
    </div>
  </div>;
}
