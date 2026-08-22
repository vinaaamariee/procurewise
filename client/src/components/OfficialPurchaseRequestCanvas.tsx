type OfficialPurchaseRequestItem = {
  stockPropertyNo: string;
  description: string;
  quantity: string;
  unit: string;
  estimatedUnitCost: string;
};

type OfficialPurchaseRequestCanvasProps = {
  entityName: string;
  fundCluster: string;
  officeSection: string;
  responsibilityCenterCode: string;
  purpose: string;
  items: OfficialPurchaseRequestItem[];
};

const MINIMUM_OFFICIAL_ROWS = 24;
const blank = "\u00a0";

function displayText(value?: string) {
  return value?.trim() || blank;
}

function displayMoney(value?: string) {
  const amount = Number(value);
  if (!value?.trim() || !Number.isFinite(amount) || amount <= 0) return blank;
  return amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayLineTotal(item?: OfficialPurchaseRequestItem) {
  if (!item) return blank;
  const quantity = Number(item.quantity);
  const cost = Number(item.estimatedUnitCost);
  if (!item.quantity.trim() || !item.estimatedUnitCost.trim() || !Number.isFinite(quantity) || !Number.isFinite(cost) || quantity <= 0 || cost <= 0) return blank;
  return (quantity * cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OfficialPurchaseRequestCanvas({ entityName, fundCluster, officeSection, responsibilityCenterCode, purpose, items }: OfficialPurchaseRequestCanvasProps) {
  const visibleRows = Math.max(MINIMUM_OFFICIAL_ROWS, items.length);
  const purposeLines = purpose ? purpose.split(/\r?\n/).slice(0, 3) : [];

  return (
    <section aria-label="Appendix 60 Purchase Request official form" className="overflow-hidden border border-[#aaa69c] bg-white p-3 text-[11px] leading-[1.35] text-[#161616] shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between border-b border-black pb-2 font-serif text-[11px] font-bold uppercase">
        <span>PURCHASE REQUEST</span>
        <span className="font-sans text-[9px] font-semibold normal-case">Appendix 60</span>
      </div>

      <div className="mt-3 grid gap-x-8 gap-y-2 font-serif sm:grid-cols-2">
        <p><span className="font-semibold">Entity Name:</span> <span className="inline-block min-w-52 border-b border-black px-1">{displayText(entityName)}</span></p>
        <p><span className="font-semibold">Fund Cluster:</span> <span className="inline-block min-w-32 border-b border-black px-1">{displayText(fundCluster)}</span></p>
      </div>
      <div className="mt-2 grid gap-x-3 gap-y-2 font-serif sm:grid-cols-[1.25fr_.85fr_.7fr]">
        <p><span className="font-semibold">Office/Section :</span> <span className="inline-block min-w-28 border-b border-black px-1">{displayText(officeSection)}</span></p>
        <p><span className="font-semibold">PR No.:</span> <span className="inline-block min-w-20 border-b border-black px-1">{blank}</span></p>
        <p><span className="font-semibold">Date:</span> <span className="inline-block min-w-20 border-b border-black px-1">{blank}</span></p>
      </div>
      <div className="mt-2 font-serif">
        <span className="font-semibold">Responsibility Center Code :</span> <span className="inline-block min-w-64 border-b border-black px-1">{displayText(responsibilityCenterCode)}</span>
      </div>

      <div className="mt-5 overflow-x-auto border-l border-t border-black">
        <table className="w-[920px] min-w-full table-fixed border-collapse font-serif text-[10px]">
          <thead>
            <tr className="text-center font-semibold">
              <th className="w-[16%] border-b border-r border-black px-1 py-1.5">Stock/ Property No.</th>
              <th className="w-[10%] border-b border-r border-black px-1 py-1.5">Unit</th>
              <th className="w-[38%] border-b border-r border-black px-1 py-1.5">Item Description</th>
              <th className="w-[10%] border-b border-r border-black px-1 py-1.5">Quantity</th>
              <th className="w-[13%] border-b border-r border-black px-1 py-1.5">Unit Cost</th>
              <th className="w-[13%] border-b border-r border-black px-1 py-1.5">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: visibleRows }, (_, index) => {
              const item = items[index];
              return (
                <tr key={index} className="h-6">
                  <td className="border-b border-r border-black px-1 align-top">{displayText(item?.stockPropertyNo)}</td>
                  <td className="border-b border-r border-black px-1 text-center align-top">{displayText(item?.unit)}</td>
                  <td className="border-b border-r border-black px-1 align-top">{displayText(item?.description)}</td>
                  <td className="border-b border-r border-black px-1 text-right align-top">{displayText(item?.quantity)}</td>
                  <td className="border-b border-r border-black px-1 text-right align-top">{displayMoney(item?.estimatedUnitCost)}</td>
                  <td className="border-b border-r border-black px-1 text-right align-top">{displayLineTotal(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-[70px_1fr] gap-x-2 font-serif">
        <span className="font-semibold">Purpose:</span>
        <div className="space-y-1">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="min-h-5 border-b border-black px-1">{displayText(purposeLines[index])}</div>)}
        </div>
      </div>

      <table className="mt-7 w-full border-collapse font-serif text-[10px]">
        <tbody>
          <tr>
            <td className="w-[22%]" />
            <td className="w-[39%] pb-2 font-semibold">Requested by:</td>
            <td className="w-[39%] pb-2 font-semibold">Approved by:</td>
          </tr>
          {[
            "Signature :",
            "Printed Name :",
            "Designation :",
          ].map((label) => (
            <tr key={label}>
              <td className="py-1 font-semibold">{label}</td>
              <td className="px-2 py-1"><span className="block h-4 border-b border-black">{blank}</span></td>
              <td className="px-2 py-1"><span className="block h-4 border-b border-black">{blank}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
