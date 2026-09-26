import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer } from "lucide-react";
import { useLocation, useSearch } from "wouter";

const BSC_HEADER_URL = "/header.png";
const BSC_FOOTER_URL = "/footer.png";

function PrintShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[900px] print:max-w-none print:m-0 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden no-print">
        <Button variant="outline" onClick={() => setLocation("/dashboard")} className="rounded-[4px] border-[#d8d1c4] text-[#1f2933] hover:bg-[#f1f3f5] dark:border-[#46515c] dark:text-[#f1f5f8] dark:hover:bg-[#232c35]">
          <ArrowLeft className="mr-1.5 h-4 w-4" />Back to workspace
        </Button>
        <Button onClick={() => window.print()} className="rounded-[4px] bg-[#7b1e1e] text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]">
          <Printer className="mr-1.5 h-4 w-4 text-white" />Print
        </Button>
      </div>
      <article className="document-canvas print-document relative border border-[#d8d1c4] bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="hidden print:block print-bsc-header" aria-hidden="true">
          <img src={BSC_HEADER_URL} alt="Batanes State College official header" className="block w-full" />
        </div>
        <header className="border-b-2 border-[#7b1e1e] pb-5 text-center print:hidden">
          <p className="text-xs font-bold tracking-[0.18em] text-[#9a6d19]">BATANES STATE COLLEGE</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#202833]">{title}</h1>
          <p className="mt-1 text-[11px] text-[#65717e]">ProcureWise controlled offline copy</p>
        </header>
        <div className="print-document-content print:px-[18mm] print:pt-[34mm] print:pb-[28mm]">
          {children}
        </div>
        <div className="hidden print:block print-bsc-footer" aria-hidden="true">
          <img src={BSC_FOOTER_URL} alt="Batanes State College official footer" className="block w-full" />
        </div>
      </article>
    </div>
  );
}
function useId(key: string) { return Number(new URLSearchParams(useSearch()).get(key)); }
function Loading() { return <p className="py-16 text-center text-sm text-[#77818d] dark:text-[#aeb9c4]">Loading printable record…</p>; }
function NotFound() { return <p className="py-16 text-center text-sm text-[#77818d] dark:text-[#aeb9c4]">The requested printable record is not available.</p>; }

export function PrintNoticePage() {
  const id = useId("id"); const notices = trpc.procurement.officer.notices.list.useQuery(undefined, { retry: false }); const notice = notices.data?.find((record) => record.id === id);
  return <PrintShell title="LETTER OF NOTICE">{notices.isLoading ? <Loading /> : !notice ? <NotFound /> : <div className="pt-7"><div className="grid gap-4 text-sm sm:grid-cols-2"><p><strong>Notice No.:</strong> {notice.noticeNumber}</p><p><strong>Date:</strong> {new Date(notice.createdAt).toLocaleDateString("en-PH")}</p><p><strong>Type:</strong> {notice.noticeType.replaceAll("_", " ")}</p><p><strong>Status:</strong> {notice.status.toUpperCase()}</p></div><h2 className="mt-8 text-base font-semibold text-[#7b1e1e]">{notice.subject}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#3f4a57]">{notice.body}</p><div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs text-[#566171]"><div className="border-t border-[#9f998f] pt-2">Prepared / issued by</div><div className="border-t border-[#9f998f] pt-2">Received by</div></div></div>}</PrintShell>;
}

export function PrintTransmittalPage() {
  const id = useId("id"); const transmittals = trpc.procurement.officer.transmittals.list.useQuery(undefined, { retry: false }); const item = transmittals.data?.find((record) => record.id === id);
  return <PrintShell title="BAC TRANSMITTAL">{transmittals.isLoading ? <Loading /> : !item ? <NotFound /> : <div className="pt-7"><div className="grid gap-4 text-sm sm:grid-cols-2"><p><strong>Transmittal No.:</strong> {item.transmittalNumber}</p><p><strong>Date:</strong> {new Date(item.createdAt).toLocaleDateString("en-PH")}</p><p><strong>From:</strong> {item.fromOffice}</p><p><strong>To:</strong> {item.toOffice}</p><p><strong>Status:</strong> {item.status.toUpperCase()}</p><p><strong>Linked PR ID:</strong> {item.purchaseRequestId || "—"}</p></div><h2 className="mt-8 text-base font-semibold text-[#7b1e1e]">{item.subject}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#3f4a57]">{item.remarks || "No additional routing remarks recorded."}</p><div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs text-[#566171]"><div className="border-t border-[#9f998f] pt-2">Prepared by</div><div className="border-t border-[#9f998f] pt-2">Received / acknowledged by</div></div></div>}</PrintShell>;
}

export function PrintPreCanvassAbstractPage() {
  const preCanvassId = useId("preCanvassId"); const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false }); const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false }); const abstract = dashboard.data?.abstractsOfCanvass.find((record) => record.preCanvassId === preCanvassId); const quotes = dashboard.data?.preCanvassQuotes.filter((quote) => quote.preCanvassId === preCanvassId) ?? [];
  return <PrintShell title="ABSTRACT OF QUOTATION">{dashboard.isLoading ? <Loading /> : !abstract ? <NotFound /> : <div className="pt-7"><div className="flex items-start justify-between gap-4 border-b border-[#d8d1c4] pb-4 text-[11px] leading-5 text-[#3f4a57]"><div><p className="font-bold text-[#7b1e1e]">Annex F</p><p className="mt-2">( x ) Furnishing/delivery of supplies, materials or equipment</p><p>(   ) Furnishing labor, services, etc.</p><p>(   ) Rental or use of transportation facilities, equipment, quarters, rooms, lot or space, etc.</p></div><div className="text-right"><p>Bids opened at {abstract.openingLocation}</p><p>{new Date(abstract.openingDate).toLocaleDateString("en-PH")}</p><p className="mt-2">To be furnished at the <strong>BATANES STATE COLLEGE</strong></p></div></div><p className="mt-5 text-center text-xs font-bold text-[#3f4a57]">NAME OF ARTICLES OR SERVICES TO BE FURNISHED, RENDERED OR FACILITIES TO BE RENTED</p><div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3"><p><strong>Abstract No.:</strong> {abstract.abstractNumber}</p><p><strong>Category:</strong> {abstract.procurementCategory}</p><p><strong>Status:</strong> {abstract.status.toUpperCase()}</p></div><table className="mt-4 w-full border-collapse text-xs"><thead><tr className="bg-[#f9f1e0] text-left text-[#7b1e1e]"><th className="border border-[#ddd6ca] p-2">Supplier quotation comparison</th><th className="border border-[#ddd6ca] p-2">Total quotation</th><th className="border border-[#ddd6ca] p-2">Delivery</th><th className="border border-[#ddd6ca] p-2">Compliance</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td className="border border-[#ddd6ca] p-2">{setup.data?.suppliers.find((supplier) => supplier.id === quote.supplierId)?.companyName || `Supplier #${quote.supplierId}`}</td><td className="border border-[#ddd6ca] p-2">₱{Number(quote.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="border border-[#ddd6ca] p-2">{quote.deliveryDays} day(s)</td><td className="border border-[#ddd6ca] p-2">{quote.isCompliant ? "Compliant" : "Non-compliant"}</td></tr>)}</tbody></table><section className="mt-7 border-t border-[#d8d1c4] pt-5"><p className="text-xs font-bold text-[#7b1e1e]">CERTIFICATION / RECOMMENDATION</p><p className="mt-3 text-sm leading-7 text-[#3f4a57]">Recommended supplier: <strong>{setup.data?.suppliers.find((supplier) => supplier.id === abstract.recommendedSupplierId)?.companyName || `Supplier #${abstract.recommendedSupplierId}`}</strong></p><p className="mt-2 text-sm leading-7 text-[#3f4a57]">{abstract.recommendationReason}</p></section><div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs text-[#566171]"><div className="border-t border-[#9f998f] pt-2">Prepared by Procurement / BAC</div><div className="border-t border-[#9f998f] pt-2">Recommended / approved by</div></div></div>}</PrintShell>;
}
