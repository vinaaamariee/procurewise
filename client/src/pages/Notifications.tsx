import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCheck, Inbox, LoaderCircle } from "lucide-react";
import { useLocation } from "wouter";

function destinationFor(entityType: string) {
  if (entityType === "pre_canvass" || entityType === "abstract_of_canvass") return "/rfq";
  if (entityType === "purchase_order" || entityType === "delivery_receipt" || entityType === "pmr_log") return "/purchase-orders";
  if (entityType === "purchase_request") return "/purchase-requests";
  return "/dashboard";
}

export default function NotificationsPage() {
  const notificationsQuery = trpc.procurement.notifications.list.useQuery(undefined, { retry: false, refetchInterval: 15_000, refetchIntervalInBackground: true });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const markRead = trpc.procurement.notifications.markRead.useMutation({ onSuccess: () => void utils.procurement.notifications.list.invalidate() });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return <div className="mx-auto max-w-[1040px]">
    <PageHeader eyebrow="Workflow alerts" title="Notification inbox" description="Role-targeted alerts record procurement handoffs, decisions, document updates, and correction requests within ProcureWise." />
    <section className="mt-7 flat-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8df] px-5 py-4"><div><p className="text-sm font-semibold text-[#34404e]">Your alerts</p><p className="mt-1 text-[11px] text-[#77818d]">{unreadCount ? `${unreadCount} unread action or status update${unreadCount === 1 ? "" : "s"}.` : "All workflow alerts have been reviewed."}</p></div><div className="grid h-9 w-9 place-items-center rounded-[4px] border border-[#ead8b3] bg-[#fffaf0] text-[#8a6520]"><BellRing className="h-4 w-4" /></div></div>{notificationsQuery.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e]" /></div> : notifications.length ? <div className="divide-y divide-[#ece8df]">{notifications.map((notification) => <article key={notification.id} className={notification.readAt ? "bg-white px-5 py-4" : "bg-[#fffaf0] px-5 py-4"}><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[#3f4a57]">{notification.title}</p>{!notification.readAt && <span className="h-1.5 w-1.5 rounded-full bg-[#7b1e1e]" aria-label="Unread" />}</div><p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-[#65717e]">{notification.body}</p><p className="mt-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[#8c7648]">{notification.kind.replaceAll("_", " ")} · {new Date(notification.createdAt).toLocaleString("en-PH")}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { if (!notification.readAt) markRead.mutate({ notificationId: notification.id }); setLocation(destinationFor(notification.entityType)); }} className="h-8 rounded-[4px] text-[11px]">Open record</Button>{!notification.readAt && <Button type="button" size="sm" variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate({ notificationId: notification.id })} className="h-8 rounded-[4px] text-[11px] text-[#7b1e1e]"><CheckCheck className="mr-1 h-3.5 w-3.5" />Mark read</Button>}</div></div></article>)}</div> : <div className="grid min-h-64 place-items-center px-6 text-center"><div><Inbox className="mx-auto h-7 w-7 text-[#b0a38d]" /><p className="mt-4 text-sm font-semibold text-[#4b5563]">No workflow alerts yet</p><p className="mt-1.5 max-w-sm text-[11px] leading-5 text-[#77818d]">Notifications appear here when procurement records move to an action assigned to your role or are returned for correction.</p></div></div>}</section>
  </div>;
}
