import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { OfficialBacResolutionCanvas } from "@/components/OfficialBacResolutionCanvas";
import { OfficialPurchaseOrderCanvas } from "@/components/OfficialPurchaseOrderCanvas";

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
          <img src={BSC_HEADER_URL} alt="Official Institutional Header" className="block w-full" />
        </div>
        <header className="border-b-2 border-[#7b1e1e] pb-5 text-center print:hidden">
          <p className="text-xs font-bold tracking-[0.18em] text-[#9a6d19]">[AGENCY / INSTITUTION NAME]</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#202833]">{title}</h1>
          <p className="mt-1 text-[11px] text-[#65717e]">ProcureWise controlled offline copy</p>
        </header>
        <div className="print-document-content print:px-[18mm] print:pt-[34mm] print:pb-[28mm]">
          {children}
        </div>
        <div className="hidden print:block print-bsc-footer" aria-hidden="true">
          <img src={BSC_FOOTER_URL} alt="Official Institutional Footer" className="block w-full" />
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
  const preCanvassId = useId("preCanvassId");
  const rfqId = useId("rfqId");
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });

  if (rfqId) {
    const rfq = dashboard.data?.rfqs.find((record) => record.id === rfqId);
    const abstract = dashboard.data?.quotationAbstracts.find((record) => record.rfqId === rfqId);
    const quotes = dashboard.data?.supplierQuotations.filter((quote) => quote.rfqId === rfqId) ?? [];
    const pr = dashboard.data?.purchaseRequests.find((p) => p.id === rfq?.purchaseRequestId);
    const items = dashboard.data?.purchaseRequestItems.filter((i) => i.purchaseRequestId === pr?.id) ?? [];
    const openingAudit = dashboard.data?.auditEvents.find(
      (a) => a.entityType === "rfq" && a.entityId === rfqId && a.action === "quotations_opened_by_bac_chairperson"
    );
    const openingDetails = openingAudit?.details as any;

    const openingLocation = openingDetails?.openingLocation || "BAC Conference Room, Batanes State College";
    const openingDate = openingDetails?.openingDate ? new Date(openingDetails.openingDate) : new Date();
    const abstractNumber = `AOQ-${new Date().getFullYear()}-${String(rfqId).padStart(4, "0")}`;

    return (
      <PrintShell title="ABSTRACT OF QUOTATION / RATINGS (ANNEX F)">
        {dashboard.isLoading ? (
          <Loading />
        ) : !rfq ? (
          <NotFound />
        ) : (
          <div className="pt-7">
            <div className="flex items-start justify-between gap-4 border-b border-[#d8d1c4] pb-4 text-[11px] leading-5 text-[#3f4a57]">
              <div>
                <p className="font-bold text-[#7b1e1e]">Annex F (R.A. 12009 / R.A. 9184 Standard)</p>
                <p className="mt-2 font-semibold">Section 5.7.1 Abstract of Quotations / Ratings</p>
                <p>( x ) Furnishing/delivery of supplies, materials or equipment</p>
                <p>(   ) Furnishing labor, services, etc.</p>
              </div>
              <div className="text-right">
                <p>Bids opened at: <strong>{openingLocation}</strong></p>
                <p>Date of Opening: {openingDate.toLocaleDateString("en-PH")}</p>
                <p>Presiding Official: <strong>{openingDetails?.chairpersonName || "DOREEN C. CASTILLO (BAC Chairperson)"}</strong></p>
                <p className="mt-2">
                  Procuring Entity: <strong>{setup.data?.settings?.entityName || "Batanes State College"}</strong>
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs font-bold text-[#3f4a57] uppercase tracking-wide">
              Comparative Matrix Setting Forth Responding Commercial Bidders & Price Quotations
            </p>

            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-4">
              <p><strong>Abstract No.:</strong> {abstractNumber}</p>
              <p><strong>Linked RFQ:</strong> {rfq.rfqNumber}</p>
              <p><strong>Linked PR:</strong> {pr?.prNumber || `PR #${rfq.purchaseRequestId}`}</p>
              <p><strong>Status:</strong> {abstract?.status.toUpperCase() || "RECORDED"}</p>
            </div>

            {items.length > 0 && (
              <div className="mt-4 border border-[#ddd6ca] rounded p-3 text-[11px] bg-neutral-50/50">
                <p className="font-bold text-[#7b1e1e] mb-1">Approved Budget for the Contract (ABC) Particulars:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {items.map((it, idx) => (
                    <li key={idx}>
                      {it.description} — {it.quantity} {it.unit} @ ₱{Number(it.estimatedUnitCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (Est. Total: ₱{(Number(it.quantity) * Number(it.estimatedUnitCost)).toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <table className="mt-5 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#f9f1e0] text-left text-[#7b1e1e]">
                  <th className="border border-[#ddd6ca] p-2">Responding Supplier / Bidder</th>
                  <th className="border border-[#ddd6ca] p-2 text-right">Total Price Quotation</th>
                  <th className="border border-[#ddd6ca] p-2 text-center">Delivery Days</th>
                  <th className="border border-[#ddd6ca] p-2 text-center">Responsiveness / Compliance</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const supplier = setup.data?.suppliers.find((s) => s.id === quote.supplierId);
                  const isRecommended = abstract?.recommendedSupplierId === quote.supplierId;
                  return (
                    <tr key={quote.id} className={isRecommended ? "bg-emerald-50/50 font-semibold" : ""}>
                      <td className="border border-[#ddd6ca] p-2">
                        <div>{supplier?.companyName || `Supplier #${quote.supplierId}`}</div>
                        <div className="text-[10px] text-[#707c8a]">TIN: {supplier?.tin || "Registered"}</div>
                        {isRecommended && (
                          <span className="text-[9px] uppercase tracking-wide text-emerald-800 font-bold block mt-0.5">
                            ★ Single or Lowest Calculated and Responsive Quotation (S/LCRQ)
                          </span>
                        )}
                      </td>
                      <td className="border border-[#ddd6ca] p-2 text-right font-mono">
                        ₱{Number(quote.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-[#ddd6ca] p-2 text-center">{quote.deliveryDays} day(s)</td>
                      <td className="border border-[#ddd6ca] p-2 text-center">
                        <span className={quote.isCompliant ? "text-emerald-800 font-bold" : "text-red-700"}>
                          {quote.isCompliant ? "Compliant & Responsive" : "Non-compliant"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <section className="mt-7 border-t border-[#d8d1c4] pt-5">
              <p className="text-xs font-bold text-[#7b1e1e]">BAC CERTIFICATION & AWARD RECOMMENDATION (STEP 5.8)</p>
              <p className="mt-3 text-sm leading-7 text-[#3f4a57]">
                We hereby certify that the above Abstract of Quotations is a true and correct record of bids opened on the date and place indicated. Award of contract is recommended in favor of{" "}
                <strong>
                  {setup.data?.suppliers.find((supplier) => supplier.id === abstract?.recommendedSupplierId)?.companyName ||
                    `Supplier #${abstract?.recommendedSupplierId || quotes[0]?.supplierId}`}
                </strong>{" "}
                having submitted the Single or Lowest Calculated and Responsive Quotation (S/LCRQ).
              </p>
              {abstract?.recommendationReason && (
                <p className="mt-2 text-xs italic text-[#65717e]">
                  Award rationale: {abstract.recommendationReason}
                </p>
              )}
            </section>

            <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs text-[#566171]">
              <div className="border-t border-[#9f998f] pt-2">
                <p className="font-bold text-black uppercase">DOREEN C. CASTILLO</p>
                <p>BAC Chairperson</p>
              </div>
              <div className="border-t border-[#9f998f] pt-2">
                <p className="font-bold text-black uppercase">PHILIP ULYSSES T. CASTILLO</p>
                <p>BAC Vice Chairperson</p>
              </div>
            </div>
          </div>
        )}
      </PrintShell>
    );
  }

  const abstract = dashboard.data?.abstractsOfCanvass.find((record) => record.preCanvassId === preCanvassId);
  const quotes = dashboard.data?.preCanvassQuotes.filter((quote) => quote.preCanvassId === preCanvassId) ?? [];
  return (
    <PrintShell title="ABSTRACT OF QUOTATION">
      {dashboard.isLoading ? (
        <Loading />
      ) : !abstract ? (
        <NotFound />
      ) : (
        <div className="pt-7">
          <div className="flex items-start justify-between gap-4 border-b border-[#d8d1c4] pb-4 text-[11px] leading-5 text-[#3f4a57]">
            <div>
              <p className="font-bold text-[#7b1e1e]">Annex F</p>
              <p className="mt-2">( x ) Furnishing/delivery of supplies, materials or equipment</p>
              <p>(   ) Furnishing labor, services, etc.</p>
              <p>(   ) Rental or use of transportation facilities, equipment, quarters, rooms, lot or space, etc.</p>
            </div>
            <div className="text-right">
              <p>Bids opened at {abstract.openingLocation}</p>
              <p>{new Date(abstract.openingDate).toLocaleDateString("en-PH")}</p>
              <p className="mt-2">
                To be furnished at the <strong>{setup.data?.settings?.entityName || "[Agency / Institution Name]"}</strong>
              </p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs font-bold text-[#3f4a57]">
            NAME OF ARTICLES OR SERVICES TO BE FURNISHED, RENDERED OR FACILITIES TO BE RENTED
          </p>
          <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
            <p><strong>Abstract No.:</strong> {abstract.abstractNumber}</p>
            <p><strong>Category:</strong> {abstract.procurementCategory}</p>
            <p><strong>Status:</strong> {abstract.status.toUpperCase()}</p>
          </div>
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#f9f1e0] text-left text-[#7b1e1e]">
                <th className="border border-[#ddd6ca] p-2">Supplier quotation comparison</th>
                <th className="border border-[#ddd6ca] p-2">Total quotation</th>
                <th className="border border-[#ddd6ca] p-2">Delivery</th>
                <th className="border border-[#ddd6ca] p-2">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="border border-[#ddd6ca] p-2">
                    {setup.data?.suppliers.find((supplier) => supplier.id === quote.supplierId)?.companyName || `Supplier #${quote.supplierId}`}
                  </td>
                  <td className="border border-[#ddd6ca] p-2">
                    ₱{Number(quote.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-[#ddd6ca] p-2">{quote.deliveryDays} day(s)</td>
                  <td className="border border-[#ddd6ca] p-2">{quote.isCompliant ? "Compliant" : "Non-compliant"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <section className="mt-7 border-t border-[#d8d1c4] pt-5">
            <p className="text-xs font-bold text-[#7b1e1e]">CERTIFICATION / RECOMMENDATION</p>
            <p className="mt-3 text-sm leading-7 text-[#3f4a57]">
              Recommended supplier:{" "}
              <strong>
                {setup.data?.suppliers.find((supplier) => supplier.id === abstract.recommendedSupplierId)?.companyName ||
                  `Supplier #${abstract.recommendedSupplierId}`}
              </strong>
            </p>
            <p className="mt-2 text-sm leading-7 text-[#3f4a57]">{abstract.recommendationReason}</p>
          </section>
          <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs text-[#566171]">
            <div className="border-t border-[#9f998f] pt-2">Prepared by Procurement / BAC</div>
            <div className="border-t border-[#9f998f] pt-2">Recommended / approved by</div>
          </div>
        </div>
      )}
    </PrintShell>
  );
}

export function PrintBacResolutionPage() {
  const [, setLocation] = useLocation();
  const search = new URLSearchParams(useSearch());
  const prId = Number(search.get("prId") || 0);
  const category = (search.get("category") as "mode_of_procurement" | "award_of_contract") || "mode_of_procurement";
  const resNo = search.get("resNo") || (category === "award_of_contract" ? "BAC-RES-AWARD-2026-001" : "2601-GAS2-009");
  const mode = search.get("mode") || "Small Value Procurement";
  const evalMode = (search.get("evalMode") as "lot_basis" | "per_item") || "lot_basis";
  const customAbc = search.get("abc");
  const customPurpose = search.get("purpose");
  const winningSupplier = search.get("winningSupplier") || undefined;
  const awardedAmount = search.get("awardedAmount") ? Number(search.get("awardedAmount")) : undefined;
  const savings = search.get("savings") ? Number(search.get("savings")) : undefined;
  const rfqNo = search.get("rfqNo") || undefined;

  const initialDocType = (search.get("docType") as "resolution" | "hope_approval" | "both") || "resolution";
  const [docType, setDocType] = useState<"resolution" | "hope_approval" | "both">(initialDocType);

  const prQuery = trpc.procurement.purchaseRequests.detail.useQuery({ purchaseRequestId: prId }, { enabled: Boolean(prId), retry: false });
  const setupQuery = trpc.procurement.setup.details.useQuery(undefined, { retry: false });

  const pr = prQuery.data?.purchaseRequest;
  const items = prQuery.data?.items ?? [];
  const entityName = setupQuery.data?.settings?.entityName || "Batanes State College";
  const collegePresidentName = "DJOVI REGALA DURANTE, DPA";
  const collegePresidentDesignation = "SUC President I";

  const totalCalculated = items.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.estimatedUnitCost), 0);
  const approvedBudget = customAbc ? Number(customAbc) : (totalCalculated || (pr?.totalEstimate ? Number(pr.totalEstimate) : 53600));

  const itemsSummary = items.length > 0
    ? items.map((i: any) => `${i.description}${i.specification ? ` (${i.specification})` : ""}`).join(", ")
    : "";
  const purposeOrItems = customPurpose || (pr ? (itemsSummary ? `${itemsSummary} -- ${pr.purpose}` : pr.purpose) : "AM snacks (Burger and Canned Juice/Soda), Packed Meals (Pork,Chicken,Veggie,Rice,Dessert,and Drinking Water),and PM Snacks (Special spaghetti and Canned Juice/ Soda)--Snacks and meals for the evaluation and interview of applicants for private sector representative (PSR).");
  const prNumber = pr?.prNumber || (search.get("prNo") || "2026-009");
  const endUserName = pr?.requesterDesignation ? `${pr.requesterDesignation}` : (search.get("endUser") || undefined);

  return (
    <div className="mx-auto max-w-[900px] print:max-w-none print:m-0 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden no-print">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="rounded-[4px] border-[#d8d1c4] text-[#1f2933] hover:bg-[#f1f3f5] dark:border-[#46515c] dark:text-[#f1f5f8] dark:hover:bg-[#232c35]"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />Back to workspace
        </Button>
        <Button
          onClick={() => window.print()}
          className="rounded-[4px] bg-[#7b1e1e] text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"
        >
          <Printer className="mr-1.5 h-4 w-4 text-white" />
          {docType === "hope_approval"
            ? "Print HoPE Approval Letter"
            : docType === "both"
            ? "Print Full Package (Both Documents)"
            : category === "award_of_contract"
            ? "Print Award Resolution (5.8)"
            : "Print Official BAC Resolution"}
        </Button>
      </div>
      <OfficialBacResolutionCanvas
        documentType={docType}
        onDocumentTypeChange={setDocType}
        resolutionCategory={category}
        resolutionNumber={resNo}
        prNumber={prNumber}
        rfqNumber={rfqNo}
        winningSupplierName={winningSupplier}
        winningQuotationAmount={awardedAmount}
        savingsAmount={savings}
        purposeOrItems={purposeOrItems}
        approvedBudget={approvedBudget}
        modeOfProcurement={mode}
        evaluationMode={evalMode}
        entityName={entityName}
        collegePresidentName={collegePresidentName}
        collegePresidentDesignation={collegePresidentDesignation}
        endUserName={endUserName}
      />
    </div>
  );
}

export function PrintPurchaseOrderPage() {
  const [, setLocation] = useLocation();
  const search = new URLSearchParams(useSearch());
  const poId = Number(search.get("id")) || 0;
  const prId = Number(search.get("prId")) || 0;

  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const prQuery = trpc.procurement.purchaseRequests.detail.useQuery(
    { purchaseRequestId: prId },
    { enabled: Boolean(prId) && prId > 0, retry: false }
  );

  const po = dashboard.data?.purchaseOrders.find((p) => p.id === poId);
  const supplier = setup.data?.suppliers.find((s) => s.id === po?.supplierId);
  const items = prQuery.data?.items ?? [];

  const formattedItems =
    items.length > 0
      ? items.map((it: any, idx: number) => ({
          no: String(idx + 1).padStart(3, "0"),
          unit: it.unit,
          description: it.specification ? `${it.description} (${it.specification})` : it.description,
          stockPropertyNo: it.stockPropertyNo || undefined,
          quantity: Number(it.quantity),
          estimatedUnitCost: Number(it.estimatedUnitCost),
          totalCost: Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost),
        }))
      : undefined;

  return (
    <div className="mx-auto max-w-[900px] print:max-w-none print:m-0 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden no-print">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="rounded-[4px] border-[#d8d1c4] text-[#1f2933] hover:bg-[#f1f3f5]"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />Back to workspace
        </Button>
        <Button
          onClick={() => window.print()}
          className="rounded-[4px] bg-[#7b1e1e] text-white hover:bg-[#641818]"
        >
          <Printer className="mr-1.5 h-4 w-4 text-white" />
          Print Official Purchase Order (App. 61)
        </Button>
      </div>

      <OfficialPurchaseOrderCanvas
        entityName={setup.data?.settings?.entityName || "BATANES STATE COLLEGE"}
        poNumber={po?.poNumber || search.get("poNo") || "2025-01-036"}
        poDate={
          po?.createdAt
            ? new Date(po.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : undefined
        }
        supplierName={supplier?.companyName || search.get("supplier") || "0"}
        supplierAddress={supplier?.address || "Basco, Batanes"}
        supplierTin={supplier?.tin || "183-008-448"}
        modeOfProcurement={po?.modeOfProcurement || search.get("mode") || "Small Value Procurement"}
        placeOfDelivery={po?.placeOfDelivery || "Batanes State College"}
        dateOfDelivery="30 days upon receipt of PO"
        deliveryTerm={po?.deliveryTerm || "FOB Destination"}
        paymentTerm={po?.paymentTerm || "15 days upon complete delivery"}
        items={formattedItems}
        totalAmount={
          po?.totalAmount ? Number(po.totalAmount) : search.get("amount") ? Number(search.get("amount")) : 73130
        }
        purpose={
          prQuery.data?.purchaseRequest?.purpose ||
          search.get("purpose") ||
          "for the program/activity of (IGP-Printing) supplies for IGP Printing Services (Testbooklet) to be charged to Fund 165"
        }
        authorizedOfficialName={po?.authorizedOfficialName || "DJOVI REGALA DURANTE"}
        authorizedOfficialDesignation={po?.authorizedOfficialDesignation || "SUC President I"}
        fundCluster={po?.fundCluster || search.get("fundCluster") || "Fund 165"}
        orsBursNumber={po?.orsBursNumber || search.get("orsNo") || "2026-01-0089"}
        chiefAccountantName={po?.chiefAccountantName || "RHEA ANGELLICA B. ADDATU, CPA"}
        chiefAccountantTitle="Accountant I"
        refNumber={search.get("refNo") || "2601-GAS2-009"}
        showInstructions={false}
      />
    </div>
  );
}

