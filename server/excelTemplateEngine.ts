import ExcelJS from "exceljs";

// ============================================================================
// TEMPLATE KEYS & METADATA
// ============================================================================
export type FormTemplateKey =
  | "purchase_request"
  | "rfq"
  | "abstract_of_quotations"
  | "purchase_order"
  | "acknowledgement_receipt";

export interface FormTemplateMeta {
  key: FormTemplateKey;
  code: string;
  displayName: string;
  regulatoryStandard: string;
  category: string;
  description: string;
  sampleFileName: string;
  placeholders: Array<{
    token: string;
    label: string;
    example: string;
    description: string;
  }>;
}

export const SUPPORTED_FORM_TEMPLATES: Record<FormTemplateKey, FormTemplateMeta> = {
  purchase_request: {
    key: "purchase_request",
    code: "PR",
    displayName: "Purchase Request (Appendix 60)",
    regulatoryStandard: "GAM for SUCs / RA 9184 Appendix 60",
    category: "Requisition",
    description: "Official government purchase request for supplies, materials, and equipment requisitions.",
    sampleFileName: "Purchase_Request_Template.xlsx",
    placeholders: [
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "System generated Purchase Request tracking number" },
      { token: "{{office}}", label: "Office / Department", example: "ICT Unit", description: "Requesting department or operating unit" },
      { token: "{{date}}", label: "Request Date", example: "March 26, 2026", description: "Official requisition submission date" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding source / GAA allotment" },
      { token: "{{responsibility_code}}", label: "Responsibility Center Code", example: "BSC-ICT-2026", description: "Accounting responsibility center" },
      { token: "{{purpose}}", label: "Purpose", example: "Procurement of office and IT supplies for 1st Quarter", description: "Justification and requisition purpose" },
      { token: "{{abc_amount}}", label: "Total ABC Amount", example: "₱145,250.00", description: "Approved Budget for the Contract total" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Forty-Five Thousand Two Hundred Fifty Pesos Only", description: "Spelled-out total monetary value" },
      { token: "{{signatory_1_name}}", label: "Requested By (Name)", example: "Prof. Maria Santos", description: "End-user requisitioner full name" },
      { token: "{{signatory_1_title}}", label: "Requested By (Title)", example: "Head, ICT Unit", description: "Requisitioner official position" },
      { token: "{{signatory_2_name}}", label: "Approved By (Name)", example: "Dr. Roberto C. Reyes", description: "Authorizing administrative official" },
      { token: "{{signatory_2_title}}", label: "Approved By (Title)", example: "College President / VP Administration", description: "Authorizing official title" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item / Stock No.", example: "1", description: "Line item sequence number" },
      { token: "{{unit}}", label: "Unit of Issue", example: "ream", description: "Unit of measurement" },
      { token: "{{item_desc}}", label: "Item Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Technical specifications of item" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Quantity requested" },
      { token: "{{unit_cost}}", label: "Unit Cost", example: "₱285.00", description: "Estimated cost per unit" },
      { token: "{{total_cost}}", label: "Total Cost", example: "₱14,250.00", description: "Line item total amount" },
    ],
  },
  rfq: {
    key: "rfq",
    code: "RFQ",
    displayName: "Request for Quotation (Official Annex D)",
    regulatoryStandard: "RA 9184 IRR Annex D",
    category: "Canvass & Market Scoping",
    description: "Prescribed request for quotation sent to eligible commercial suppliers for price sounding.",
    sampleFileName: "Request_For_Quotation_Template.xlsx",
    placeholders: [
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Official Request for Quotation sequence code" },
      { token: "{{pr_no}}", label: "Associated PR No.", example: "PR-2026-03-014", description: "Linked Purchase Request identification" },
      { token: "{{date}}", label: "Issuance Date", example: "March 26, 2026", description: "Date of RFQ transmission" },
      { token: "{{deadline}}", label: "Submission Deadline", example: "April 02, 2026 (5:00 PM)", description: "Deadline for supplier quotation submission" },
      { token: "{{delivery_term}}", label: "Delivery Period", example: "15 Calendar Days", description: "Required days to deliver post-PO" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "Batanes State College, San Antonio, Basco", description: "Designated receiving location" },
      { token: "{{supplier_name}}", label: "Supplier / Bidder Name", example: "Batanes Commercial Hub", description: "Name of invited or responding supplier" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "National Road, Basco, Batanes", description: "Supplier business address" },
      { token: "{{philgeps_no}}", label: "PhilGEPS Registration No.", example: "2024-89312", description: "Supplier PhilGEPS registry code" },
      { token: "{{abc_amount}}", label: "Total ABC Amount", example: "₱145,250.00", description: "Maximum budget limit for the procurement" },
      { token: "{{canvasser_name}}", label: "Canvasser Name", example: "Juan Dela Cruz", description: "Procurement staff / canvasser" },
      { token: "{{canvasser_title}}", label: "Canvasser Title", example: "Procurement Officer I", description: "Canvasser designation" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Item sequence number" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Required quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of measurement" },
      { token: "{{item_desc}}", label: "Item & Specifications", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Detailed specification" },
      { token: "{{compliance}}", label: "Compliance Statement", example: "Compliant", description: "Supplier technical compliance" },
      { token: "{{bid_unit_price}}", label: "Bidder Unit Price", example: "₱275.00", description: "Offered price per unit" },
      { token: "{{bid_total_price}}", label: "Bidder Total Price", example: "₱13,750.00", description: "Calculated item quotation total" },
    ],
  },
  abstract_of_quotations: {
    key: "abstract_of_quotations",
    code: "AOQ",
    displayName: "Abstract of Quotations / Canvass (Annex F)",
    regulatoryStandard: "RA 9184 IRR Annex F",
    category: "BAC Evaluation & Award",
    description: "Official comparison matrix evaluating commercial quotations to establish the lowest calculated bid.",
    sampleFileName: "Abstract_Of_Quotations_Template.xlsx",
    placeholders: [
      { token: "{{aoq_no}}", label: "Abstract Number", example: "AOQ-2026-03-042", description: "Official BAC Abstract identification" },
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Associated quotation canvass reference" },
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "Originating Purchase Request number" },
      { token: "{{date}}", label: "Opening Date", example: "April 03, 2026", description: "Date of official canvass opening" },
      { token: "{{opening_location}}", label: "Opening Location", example: "Procurement Office / BAC Conference Room", description: "Canvass opening room" },
      { token: "{{abc_amount}}", label: "Approved Budget (ABC)", example: "₱145,250.00", description: "Approved budget threshold" },
      { token: "{{recommended_supplier}}", label: "Recommended Awardee", example: "Ivatan Trading & General Supplies", description: "Supplier evaluated as lowest calculated compliant bid" },
      { token: "{{awarded_amount}}", label: "Awarded Contract Total", example: "₱138,400.00", description: "Recommended contract price" },
      { token: "{{savings}}", label: "Government Savings", example: "₱6,850.00", description: "Difference between ABC and Awarded Amount" },
      { token: "{{recommendation_reason}}", label: "Evaluation Basis / Reason", example: "Lowest calculated responsive quotation complying with all specifications.", description: "Justification for award recommendation" },
      { token: "{{bac_chairperson}}", label: "BAC Chairperson", example: "Dr. Elena G. Martinez", description: "Chairperson of Bids and Awards Committee" },
      { token: "{{bac_vice_chair}}", label: "BAC Vice-Chairperson", example: "Engr. Leo V. Fernandez", description: "Vice-Chairperson of BAC" },
      { token: "{{bac_members}}", label: "BAC Members", example: "Atty. Clara Ramos, Dr. Samuel Cruz", description: "Participating BAC Committee Members" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Item sequence number" },
      { token: "{{item_desc}}", label: "Item Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Article or commodity specification" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Measurement unit" },
      { token: "{{supplier_1_name}}", label: "Supplier 1 Name", example: "Ivatan Trading", description: "First evaluated bidder name" },
      { token: "{{supplier_1_bid}}", label: "Supplier 1 Bid", example: "₱13,750.00", description: "First bidder total quote" },
      { token: "{{supplier_2_name}}", label: "Supplier 2 Name", example: "Northern Goods Co.", description: "Second evaluated bidder name" },
      { token: "{{supplier_2_bid}}", label: "Supplier 2 Bid", example: "₱14,100.00", description: "Second bidder total quote" },
      { token: "{{lowest_bidder}}", label: "Lowest Bidder for Item", example: "Ivatan Trading", description: "Winning item offer" },
    ],
  },
  purchase_order: {
    key: "purchase_order",
    code: "PO",
    displayName: "Purchase Order (Appendix 61)",
    regulatoryStandard: "GAM for SUCs / RA 9184 Appendix 61",
    category: "Contract & Award",
    description: "Prescribed government contract binding the institution and awarded supplier for goods delivery.",
    sampleFileName: "Purchase_Order_Template.xlsx",
    placeholders: [
      { token: "{{po_no}}", label: "PO Number", example: "PO-2026-03-019", description: "Legally binding Purchase Order number" },
      { token: "{{date}}", label: "PO Date", example: "April 05, 2026", description: "Contract issuance date" },
      { token: "{{pr_no}}", label: "Linked PR Number", example: "PR-2026-03-014", description: "Associated Purchase Request" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Ivatan Trading & General Supplies", description: "Awarded contractor business name" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "National Road, San Antonio, Basco, Batanes", description: "Contractor official address" },
      { token: "{{tin_no}}", label: "TIN", example: "123-456-789-000", description: "Taxpayer Identification Number" },
      { token: "{{philgeps_no}}", label: "PhilGEPS Registration No.", example: "2024-89312", description: "PhilGEPS merchant identification" },
      { token: "{{procurement_mode}}", label: "Mode of Procurement", example: "NP-53.9 Small Value Procurement", description: "RA 9184 statutory method" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "Batanes State College Supply Office", description: "Physical delivery destination" },
      { token: "{{delivery_date}}", label: "Delivery Date", example: "Within 15 days upon receipt of NTP/PO", description: "Expected delivery deadline" },
      { token: "{{delivery_term}}", label: "Delivery Term", example: "FOB Destination", description: "Shipping and risk transfer term" },
      { token: "{{payment_term}}", label: "Payment Term", example: "Government Terms (Check / LDDAP upon inspection)", description: "Payment processing terms" },
      { token: "{{total_amount}}", label: "Total PO Amount", example: "₱138,400.00", description: "Total contract value in Philippine Peso" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Thirty-Eight Thousand Four Hundred Pesos Only", description: "Spelled out total amount" },
      { token: "{{authorized_official}}", label: "Authorized Official (HOPE)", example: "Dr. Roberto C. Reyes", description: "Head of Procuring Entity full name" },
      { token: "{{authorized_official_title}}", label: "HOPE Title", example: "College President", description: "Title of signing official" },
      { token: "{{accountant_name}}", label: "Chief Accountant", example: "Ms. Teresa M. Valiente, CPA", description: "Head of Accounting Unit certifying funds" },
      { token: "{{supplier_representative}}", label: "Supplier Conforme (Name)", example: "Mr. Arnold B. Gomez", description: "Authorized representative of contractor" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Stock / Property No.", example: "1", description: "Sequence number" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of issue" },
      { token: "{{item_desc}}", label: "Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Procured item description" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Delivered quantity" },
      { token: "{{unit_cost}}", label: "Unit Cost", example: "₱275.00", description: "Awarded unit price" },
      { token: "{{total_cost}}", label: "Amount", example: "₱13,750.00", description: "Item line total" },
    ],
  },
  acknowledgement_receipt: {
    key: "acknowledgement_receipt",
    code: "AR",
    displayName: "Acknowledgement Receipt for Property / Inventory (PAR/ICS)",
    regulatoryStandard: "GAM for SUCs Appendix 71 / Property Management",
    category: "Property & Inspection",
    description: "Official acknowledgement certificate documenting receipt, custody, and physical handover of procured goods.",
    sampleFileName: "Acknowledgement_Receipt_Template.xlsx",
    placeholders: [
      { token: "{{receipt_no}}", label: "Receipt / PAR No.", example: "AR-2026-04-007", description: "Property acknowledgement tracking number" },
      { token: "{{date}}", label: "Receipt Date", example: "April 18, 2026", description: "Date items were physically accepted" },
      { token: "{{po_no}}", label: "Linked PO Number", example: "PO-2026-03-019", description: "Originating Purchase Order" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Ivatan Trading & General Supplies", description: "Delivering contractor" },
      { token: "{{receiving_office}}", label: "Receiving Office / Custodian", example: "ICT Unit", description: "End-user office accepting property custody" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding code" },
      { token: "{{physical_location}}", label: "Physical Location", example: "College Library & Computer Laboratories", description: "Physical deployment area" },
      { token: "{{total_amount}}", label: "Total Asset Value", example: "₱138,400.00", description: "Cumulative valuation of accepted assets" },
      { token: "{{received_by_name}}", label: "Received By (Custodian)", example: "Prof. Maria Santos", description: "End-user custodian receiving property" },
      { token: "{{received_by_designation}}", label: "Custodian Title", example: "Head, ICT Unit", description: "Custodian job designation" },
      { token: "{{received_date}}", label: "Received Date", example: "April 18, 2026", description: "Custodian signing date" },
      { token: "{{issued_by_name}}", label: "Issued By (Supply Officer)", example: "Engr. Michael D. Tan", description: "Property & Supply Officer" },
      { token: "{{issued_by_designation}}", label: "Supply Officer Title", example: "Administrative Officer V (Supply)", description: "Supply officer designation" },
      { token: "{{issued_date}}", label: "Issued Date", example: "April 18, 2026", description: "Issuing officer date" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Sequential index" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Accepted quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of issue" },
      { token: "{{item_desc}}", label: "Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Commodity description" },
      { token: "{{property_no}}", label: "Property / Inventory Tag No.", example: "BSC-INV-2026-0041", description: "Institutional inventory sticker number" },
      { token: "{{date_acquired}}", label: "Date Acquired", example: "2026-04-18", description: "Official acquisition date" },
      { token: "{{unit_cost}}", label: "Unit Value", example: "₱275.00", description: "Unit capitalization cost" },
      { token: "{{total_cost}}", label: "Total Value", example: "₱13,750.00", description: "Extended item valuation" },
    ],
  },
};

// ============================================================================
// SAMPLE DATA GENERATOR FOR DEMO & TESTING
// ============================================================================
export function getSampleFormData(key: FormTemplateKey): Record<string, any> {
  const commonItems = [
    { item_no: 1, unit: "ream", item_desc: "Multi-purpose Bond Paper A4 (70gsm, 500 sheets/ream)", qty: 50, unit_cost: "₱285.00", total_cost: "₱14,250.00", property_no: "BSC-PROP-2026-001", date_acquired: "2026-04-15" },
    { item_no: 2, unit: "cartridge", item_desc: "Original HP Toner Cartridge 85A Black", qty: 4, unit_cost: "₱3,450.00", total_cost: "₱13,800.00", property_no: "BSC-PROP-2026-002", date_acquired: "2026-04-15" },
    { item_no: 3, unit: "unit", item_desc: "Heavy-Duty 2-Hole Paper Puncher (Metal Chassis)", qty: 6, unit_cost: "₱750.00", total_cost: "₱4,500.00", property_no: "BSC-PROP-2026-003", date_acquired: "2026-04-15" },
    { item_no: 4, unit: "box", item_desc: "Permanent Marker Pen (Black, Fine Bullet Tip, 12s)", qty: 10, unit_cost: "₱420.00", total_cost: "₱4,200.00", property_no: "BSC-PROP-2026-004", date_acquired: "2026-04-15" },
    { item_no: 5, unit: "unit", item_desc: "Uninterruptible Power Supply (UPS 650VA / 360W)", qty: 8, unit_cost: "₱3,200.00", total_cost: "₱25,600.00", property_no: "BSC-PROP-2026-005", date_acquired: "2026-04-15" },
  ];

  switch (key) {
    case "purchase_request":
      return {
        pr_no: "PR-2026-03-014",
        office: "ICT Unit / Office of the Vice President for Administration",
        date: "March 26, 2026",
        fund_cluster: "Regular Agency Fund (01101101)",
        responsibility_code: "BSC-ICT-2026",
        purpose: "Urgent procurement of standard office, printing, and ICT supplies for 1st Semester operations.",
        abc_amount: "₱62,350.00",
        amount_in_words: "Sixty-Two Thousand Three Hundred Fifty Pesos Only",
        signatory_1_name: "Prof. Maria Santos",
        signatory_1_title: "Head, ICT Unit",
        signatory_2_name: "Dr. Roberto C. Reyes",
        signatory_2_title: "College President / Authorized HOPE",
        items: commonItems,
      };

    case "rfq":
      return {
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "March 26, 2026",
        deadline: "April 02, 2026 (5:00 PM)",
        delivery_term: "15 Calendar Days",
        place_of_delivery: "Batanes State College Supply & Property Office, San Antonio, Basco",
        supplier_name: "Ivatan Trading & General Supplies",
        supplier_address: "National Road, San Antonio, Basco, Batanes",
        philgeps_no: "2024-89312",
        abc_amount: "₱62,350.00",
        canvasser_name: "Juan Dela Cruz",
        canvasser_title: "Procurement Officer I",
        items: commonItems.map((item) => ({
          ...item,
          compliance: "Comply",
          bid_unit_price: item.unit_cost,
          bid_total_price: item.total_cost,
        })),
      };

    case "abstract_of_quotations":
      return {
        aoq_no: "AOQ-2026-03-042",
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "April 03, 2026",
        opening_location: "BAC Conference Room, Administration Building, Batanes State College",
        abc_amount: "₱62,350.00",
        recommended_supplier: "Ivatan Trading & General Supplies",
        awarded_amount: "₱59,800.00",
        savings: "₱2,550.00",
        recommendation_reason: "Evaluated as the Lowest Calculated Responsive Quotation meeting all technical specifications and compliance criteria.",
        bac_chairperson: "Dr. Elena G. Martinez",
        bac_vice_chair: "Engr. Leo V. Fernandez",
        bac_members: "Atty. Clara Ramos, Dr. Samuel Cruz, Prof. Alan Perez",
        items: commonItems.map((item, idx) => ({
          ...item,
          supplier_1_name: "Ivatan Trading",
          supplier_1_bid: item.total_cost,
          supplier_2_name: "Northern Goods",
          supplier_2_bid: `₱${(Number(item.total_cost.replace(/[^0-9.]/g, "")) * 1.05).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          lowest_bidder: "Ivatan Trading",
        })),
      };

    case "purchase_order":
      return {
        po_no: "PO-2026-03-019",
        date: "April 05, 2026",
        pr_no: "PR-2026-03-014",
        supplier_name: "Ivatan Trading & General Supplies",
        supplier_address: "National Road, San Antonio, Basco, Batanes",
        tin_no: "123-456-789-000",
        philgeps_no: "2024-89312",
        procurement_mode: "NP-53.9 Small Value Procurement (RA 9184)",
        place_of_delivery: "Batanes State College Supply Office, San Antonio, Basco",
        delivery_date: "Within 15 days upon receipt of PO",
        delivery_term: "FOB Destination",
        payment_term: "Government Terms (Check / LDDAP after final inspection)",
        total_amount: "₱59,800.00",
        amount_in_words: "Fifty-Nine Thousand Eight Hundred Pesos Only",
        authorized_official: "Dr. Roberto C. Reyes",
        authorized_official_title: "College President",
        accountant_name: "Ms. Teresa M. Valiente, CPA",
        supplier_representative: "Mr. Arnold B. Gomez",
        items: commonItems,
      };

    case "acknowledgement_receipt":
      return {
        receipt_no: "AR-2026-04-007",
        date: "April 18, 2026",
        po_no: "PO-2026-03-019",
        supplier_name: "Ivatan Trading & General Supplies",
        receiving_office: "ICT Unit / Department of Information Technology",
        fund_cluster: "Regular Agency Fund (01101101)",
        physical_location: "College Library & Computer Laboratory 2",
        total_amount: "₱59,800.00",
        received_by_name: "Prof. Maria Santos",
        received_by_designation: "Head, ICT Unit",
        received_date: "April 18, 2026",
        issued_by_name: "Engr. Michael D. Tan",
        issued_by_designation: "Administrative Officer V (Property & Supply)",
        issued_date: "April 18, 2026",
        items: commonItems,
      };
  }
}

// ============================================================================
// PROGRAMMATIC MASTER EXCEL TEMPLATE GENERATORS
// ============================================================================
export async function createMasterExcelWorkbook(key: FormTemplateKey): Promise<ExcelJS.Workbook> {
  const mod = (ExcelJS as any).default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  wb.creator = "ProcureWise Government Forms Engine";
  wb.created = new Date();

  const meta = SUPPORTED_FORM_TEMPLATES[key];
  const ws = wb.addWorksheet(meta.code, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: key === "abstract_of_quotations" ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF333333" } },
    bottom: { style: "thin", color: { argb: "FF333333" } },
    left: { style: "thin", color: { argb: "FF333333" } },
    right: { style: "thin", color: { argb: "FF333333" } },
  };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F1EC" },
  };

  const maroonText: Partial<ExcelJS.Font> = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: "FF7B1E1E" },
  };

  const boldText: Partial<ExcelJS.Font> = {
    name: "Arial",
    size: 9,
    bold: true,
    color: { argb: "FF202833" },
  };

  const normalText: Partial<ExcelJS.Font> = {
    name: "Arial",
    size: 9,
    color: { argb: "FF202833" },
  };

  switch (key) {
    case "purchase_request": {
      ws.columns = [
        { width: 12 }, // A: Item No.
        { width: 10 }, // B: Unit
        { width: 38 }, // C: Description
        { width: 10 }, // D: Qty
        { width: 16 }, // E: Unit Cost
        { width: 18 }, // F: Total Cost
      ];

      // Row 1-3: Institution Header Title
      ws.mergeCells("A1:F1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:F2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.mergeCells("A3:F3");
      ws.getCell("A3").value = "PURCHASE REQUEST (Appendix 60)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };

      // Row 5-7: Requisition Metadata Block
      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "Batanes State College";
      ws.getCell("B5").font = normalText;

      ws.getCell("E5").value = "Fund Cluster:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{fund_cluster}}";
      ws.getCell("F5").font = normalText;

      ws.getCell("A6").value = "Office/Section:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:C6");
      ws.getCell("B6").value = "{{office}}";
      ws.getCell("B6").font = normalText;

      ws.getCell("E6").value = "PR No.:";
      ws.getCell("E6").font = boldText;
      ws.getCell("F6").value = "{{pr_no}}";
      ws.getCell("F6").font = normalText;

      ws.getCell("A7").value = "Responsibility:";
      ws.getCell("A7").font = boldText;
      ws.getCell("B7").value = "{{responsibility_code}}";
      ws.getCell("B7").font = normalText;

      ws.getCell("E7").value = "Date:";
      ws.getCell("E7").font = boldText;
      ws.getCell("F7").value = "{{date}}";
      ws.getCell("F7").font = normalText;

      // Row 9: Table Column Headers
      const colHeaders = ["Stock / Item No.", "Unit", "Item Description & Specifications", "Quantity", "Estimated Unit Cost", "Estimated Total Cost"];
      const headerRow = ws.getRow(9);
      colHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
      headerRow.height = 24;

      // Row 10: Dynamic Items Template Row (Cloned during data injection)
      const itemRow = ws.getRow(10);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{unit}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{item_desc}}";
      itemRow.getCell(3).alignment = { horizontal: "left" };
      itemRow.getCell(4).value = "{{qty}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{unit_cost}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{total_cost}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      for (let c = 1; c <= 6; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }

      // Row 11: Total ABC Summary
      ws.mergeCells("A11:E11");
      ws.getCell("A11").value = "TOTAL APPROVED BUDGET FOR THE CONTRACT (ABC):";
      ws.getCell("A11").font = boldText;
      ws.getCell("A11").alignment = { horizontal: "right" };
      ws.getCell("A11").border = thinBorder;
      ws.getCell("F11").value = "{{abc_amount}}";
      ws.getCell("F11").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F11").alignment = { horizontal: "right" };
      ws.getCell("F11").border = thinBorder;

      // Row 12: Purpose Block
      ws.mergeCells("A12:F12");
      ws.getCell("A12").value = "Purpose: {{purpose}}";
      ws.getCell("A12").font = normalText;
      ws.getCell("A12").alignment = { horizontal: "left", wrapText: true };
      ws.getCell("A12").border = thinBorder;
      ws.getRow(12).height = 30;

      // Row 14-17: Signatories
      ws.mergeCells("A14:C14");
      ws.getCell("A14").value = "Requested by:";
      ws.getCell("A14").font = boldText;

      ws.mergeCells("D14:F14");
      ws.getCell("D14").value = "Approved by:";
      ws.getCell("D14").font = boldText;

      ws.mergeCells("A16:C16");
      ws.getCell("A16").value = "{{signatory_1_name}}";
      ws.getCell("A16").font = { ...boldText, underline: true };
      ws.getCell("A16").alignment = { horizontal: "center" };

      ws.mergeCells("D16:F16");
      ws.getCell("D16").value = "{{signatory_2_name}}";
      ws.getCell("D16").font = { ...boldText, underline: true };
      ws.getCell("D16").alignment = { horizontal: "center" };

      ws.mergeCells("A17:C17");
      ws.getCell("A17").value = "{{signatory_1_title}}";
      ws.getCell("A17").font = normalText;
      ws.getCell("A17").alignment = { horizontal: "center" };

      ws.mergeCells("D17:F17");
      ws.getCell("D17").value = "{{signatory_2_title}}";
      ws.getCell("D17").font = normalText;
      ws.getCell("D17").alignment = { horizontal: "center" };
      break;
    }

    case "rfq": {
      ws.columns = [
        { width: 10 }, // A: Item No.
        { width: 8 },  // B: Qty
        { width: 10 }, // C: Unit
        { width: 34 }, // D: Specs
        { width: 14 }, // E: Compliance
        { width: 16 }, // F: Unit Price
        { width: 16 }, // G: Total Price
      ];

      ws.mergeCells("A1:G1");
      ws.getCell("A1").value = "BATANES STATE COLLEGE — PROCUREMENT UNIT";
      ws.getCell("A1").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:G2");
      ws.getCell("A2").value = "REQUEST FOR QUOTATION (Official Annex D)";
      ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.getCell("A4").value = "Supplier Name:";
      ws.getCell("A4").font = boldText;
      ws.mergeCells("B4:D4");
      ws.getCell("B4").value = "{{supplier_name}}";
      ws.getCell("B4").font = normalText;

      ws.getCell("E4").value = "RFQ No.:";
      ws.getCell("E4").font = boldText;
      ws.mergeCells("F4:G4");
      ws.getCell("F4").value = "{{rfq_no}}";
      ws.getCell("F4").font = normalText;

      ws.getCell("A5").value = "Address / TIN:";
      ws.getCell("A5").font = boldText;
      ws.mergeCells("B5:D5");
      ws.getCell("B5").value = "{{supplier_address}}";
      ws.getCell("B5").font = normalText;

      ws.getCell("E5").value = "Date:";
      ws.getCell("E5").font = boldText;
      ws.mergeCells("F5:G5");
      ws.getCell("F5").value = "{{date}}";
      ws.getCell("F5").font = normalText;

      ws.getCell("A6").value = "PhilGEPS Reg No.:";
      ws.getCell("A6").font = boldText;
      ws.getCell("B6").value = "{{philgeps_no}}";
      ws.getCell("B6").font = normalText;

      ws.getCell("E6").value = "Deadline:";
      ws.getCell("E6").font = boldText;
      ws.mergeCells("F6:G6");
      ws.getCell("F6").value = "{{deadline}}";
      ws.getCell("F6").font = normalText;

      const rfqHeaders = ["Item No.", "Qty", "Unit", "Item Description & Specifications", "Compliance", "Unit Price", "Total Amount"];
      const headerRow = ws.getRow(8);
      rfqHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const itemRow = ws.getRow(9);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{qty}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{unit}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{item_desc}}";
      itemRow.getCell(4).alignment = { horizontal: "left" };
      itemRow.getCell(5).value = "{{compliance}}";
      itemRow.getCell(5).alignment = { horizontal: "center" };
      itemRow.getCell(6).value = "{{bid_unit_price}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      itemRow.getCell(7).value = "{{bid_total_price}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      for (let c = 1; c <= 7; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }

      ws.mergeCells("A10:E10");
      ws.getCell("A10").value = "TOTAL BID / QUOTATION AMOUNT:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").alignment = { horizontal: "right" };
      ws.getCell("A10").border = thinBorder;
      ws.mergeCells("F10:G10");
      ws.getCell("F10").value = "{{abc_amount}}";
      ws.getCell("F10").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F10").alignment = { horizontal: "right" };
      ws.getCell("F10").border = thinBorder;

      ws.mergeCells("A12:D12");
      ws.getCell("A12").value = "Canvassed by: {{canvasser_name}} ({{canvasser_title}})";
      ws.getCell("A12").font = boldText;

      ws.mergeCells("E12:G12");
      ws.getCell("E12").value = "Supplier Conforme / Signature over Printed Name";
      ws.getCell("E12").font = boldText;
      break;
    }

    case "abstract_of_quotations": {
      ws.columns = [
        { width: 8 },  // Item No
        { width: 30 }, // Specs
        { width: 8 },  // Qty
        { width: 8 },  // Unit
        { width: 14 }, // ABC Total
        { width: 18 }, // Supplier 1
        { width: 18 }, // Supplier 2
        { width: 18 }, // Lowest Bidder
      ];

      ws.mergeCells("A1:H1");
      ws.getCell("A1").value = "BATANES STATE COLLEGE — BIDS AND AWARDS COMMITTEE";
      ws.getCell("A1").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:H2");
      ws.getCell("A2").value = "ABSTRACT OF QUOTATIONS (Annex F)";
      ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.getCell("A4").value = "Abstract No.:";
      ws.getCell("A4").font = boldText;
      ws.getCell("B4").value = "{{aoq_no}}";
      ws.getCell("B4").font = normalText;

      ws.getCell("E4").value = "Date:";
      ws.getCell("E4").font = boldText;
      ws.getCell("F4").value = "{{date}}";
      ws.getCell("F4").font = normalText;

      ws.getCell("A5").value = "Linked RFQ / PR:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "{{rfq_no}} / {{pr_no}}";
      ws.getCell("B5").font = normalText;

      ws.getCell("E5").value = "Total ABC:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{abc_amount}}";
      ws.getCell("F5").font = normalText;

      const aoqHeaders = ["Item", "Item Description", "Qty", "Unit", "ABC Limit", "Bidder 1: {{supplier_1_name}}", "Bidder 2: {{supplier_2_name}}", "Lowest Compliant Bidder"];
      const headerRow = ws.getRow(7);
      aoqHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const itemRow = ws.getRow(8);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{item_desc}}";
      itemRow.getCell(2).alignment = { horizontal: "left" };
      itemRow.getCell(3).value = "{{qty}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{unit}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{abc_amount}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{supplier_1_bid}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      itemRow.getCell(7).value = "{{supplier_2_bid}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      itemRow.getCell(8).value = "{{lowest_bidder}}";
      itemRow.getCell(8).alignment = { horizontal: "center" };
      for (let c = 1; c <= 8; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }

      ws.mergeCells("A10:H10");
      ws.getCell("A10").value = "RECOMMENDATION OF AWARD:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").fill = headerFill;
      ws.getCell("A10").border = thinBorder;

      ws.mergeCells("A11:H11");
      ws.getCell("A11").value = "Awarded Supplier: {{recommended_supplier}} | Awarded Contract Total: {{awarded_amount}} | Savings: {{savings}}";
      ws.getCell("A11").font = boldText;
      ws.getCell("A11").border = thinBorder;

      ws.mergeCells("A12:H12");
      ws.getCell("A12").value = "Reason / Justification: {{recommendation_reason}}";
      ws.getCell("A12").font = normalText;
      ws.getCell("A12").border = thinBorder;

      ws.mergeCells("A14:C14");
      ws.getCell("A14").value = "BAC Chairperson: {{bac_chairperson}}";
      ws.getCell("A14").font = boldText;

      ws.mergeCells("D14:F14");
      ws.getCell("D14").value = "BAC Vice-Chair: {{bac_vice_chair}}";
      ws.getCell("D14").font = boldText;

      ws.mergeCells("G14:H14");
      ws.getCell("G14").value = "BAC Members: {{bac_members}}";
      ws.getCell("G14").font = normalText;
      break;
    }

    case "purchase_order": {
      ws.columns = [
        { width: 12 }, // Item No
        { width: 10 }, // Unit
        { width: 36 }, // Description
        { width: 10 }, // Qty
        { width: 16 }, // Unit Cost
        { width: 18 }, // Total Cost
      ];

      ws.mergeCells("A1:F1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:F2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.mergeCells("A3:F3");
      ws.getCell("A3").value = "PURCHASE ORDER (Appendix 61)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };

      ws.getCell("A5").value = "Supplier:";
      ws.getCell("A5").font = boldText;
      ws.mergeCells("B5:C5");
      ws.getCell("B5").value = "{{supplier_name}}";
      ws.getCell("B5").font = normalText;

      ws.getCell("E5").value = "P.O. No.:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{po_no}}";
      ws.getCell("F5").font = normalText;

      ws.getCell("A6").value = "Address:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:C6");
      ws.getCell("B6").value = "{{supplier_address}}";
      ws.getCell("B6").font = normalText;

      ws.getCell("E6").value = "Date:";
      ws.getCell("E6").font = boldText;
      ws.getCell("F6").value = "{{date}}";
      ws.getCell("F6").font = normalText;

      ws.getCell("A7").value = "TIN / PhilGEPS:";
      ws.getCell("A7").font = boldText;
      ws.getCell("B7").value = "{{tin_no}} / {{philgeps_no}}";
      ws.getCell("B7").font = normalText;

      ws.getCell("E7").value = "Procurement Mode:";
      ws.getCell("E7").font = boldText;
      ws.getCell("F7").value = "{{procurement_mode}}";
      ws.getCell("F7").font = normalText;

      ws.mergeCells("A9:F9");
      ws.getCell("A9").value = "Gentlemen: Please furnish this Office the following articles subject to the terms and conditions contained herein:";
      ws.getCell("A9").font = { name: "Arial", size: 9, italic: true };

      const poHeaders = ["Stock / Property No.", "Unit", "Description", "Quantity", "Unit Cost", "Amount"];
      const headerRow = ws.getRow(11);
      poHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const itemRow = ws.getRow(12);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{unit}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{item_desc}}";
      itemRow.getCell(3).alignment = { horizontal: "left" };
      itemRow.getCell(4).value = "{{qty}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{unit_cost}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{total_cost}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      for (let c = 1; c <= 6; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }

      ws.mergeCells("A13:E13");
      ws.getCell("A13").value = "TOTAL AMOUNT (Figures):";
      ws.getCell("A13").font = boldText;
      ws.getCell("A13").alignment = { horizontal: "right" };
      ws.getCell("A13").border = thinBorder;
      ws.getCell("F13").value = "{{total_amount}}";
      ws.getCell("F13").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F13").alignment = { horizontal: "right" };
      ws.getCell("F13").border = thinBorder;

      ws.mergeCells("A14:F14");
      ws.getCell("A14").value = "Amount in Words: {{amount_in_words}}";
      ws.getCell("A14").font = normalText;
      ws.getCell("A14").border = thinBorder;

      ws.mergeCells("A16:C16");
      ws.getCell("A16").value = "Conforme: {{supplier_representative}}";
      ws.getCell("A16").font = boldText;

      ws.mergeCells("D16:F16");
      ws.getCell("D16").value = "Very truly yours: {{authorized_official}} ({{authorized_official_title}})";
      ws.getCell("D16").font = boldText;
      break;
    }

    case "acknowledgement_receipt": {
      ws.columns = [
        { width: 8 },  // Item No
        { width: 8 },  // Qty
        { width: 8 },  // Unit
        { width: 34 }, // Specs
        { width: 18 }, // Property No
        { width: 12 }, // Date Acquired
        { width: 14 }, // Unit Cost
        { width: 16 }, // Total Cost
      ];

      ws.mergeCells("A1:H1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:H2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.mergeCells("A3:H3");
      ws.getCell("A3").value = "ACKNOWLEDGEMENT RECEIPT FOR PROPERTY (PAR / ICS)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };

      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "Batanes State College";
      ws.getCell("B5").font = normalText;

      ws.getCell("F5").value = "Fund Cluster:";
      ws.getCell("F5").font = boldText;
      ws.mergeCells("G5:H5");
      ws.getCell("G5").value = "{{fund_cluster}}";
      ws.getCell("G5").font = normalText;

      ws.getCell("A6").value = "Receiving Office:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:D6");
      ws.getCell("B6").value = "{{receiving_office}}";
      ws.getCell("B6").font = normalText;

      ws.getCell("F6").value = "Receipt No.:";
      ws.getCell("F6").font = boldText;
      ws.mergeCells("G6:H6");
      ws.getCell("G6").value = "{{receipt_no}}";
      ws.getCell("G6").font = normalText;

      const arHeaders = ["Item No.", "Qty", "Unit", "Item Description", "Property No.", "Date Acquired", "Unit Cost", "Total Amount"];
      const headerRow = ws.getRow(8);
      arHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const itemRow = ws.getRow(9);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{qty}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{unit}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{item_desc}}";
      itemRow.getCell(4).alignment = { horizontal: "left" };
      itemRow.getCell(5).value = "{{property_no}}";
      itemRow.getCell(5).alignment = { horizontal: "center" };
      itemRow.getCell(6).value = "{{date_acquired}}";
      itemRow.getCell(6).alignment = { horizontal: "center" };
      itemRow.getCell(7).value = "{{unit_cost}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      itemRow.getCell(8).value = "{{total_cost}}";
      itemRow.getCell(8).alignment = { horizontal: "right" };
      for (let c = 1; c <= 8; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }

      ws.mergeCells("A10:G10");
      ws.getCell("A10").value = "TOTAL PROPERTY VALUE:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").alignment = { horizontal: "right" };
      ws.getCell("A10").border = thinBorder;
      ws.getCell("H10").value = "{{total_amount}}";
      ws.getCell("H10").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("H10").alignment = { horizontal: "right" };
      ws.getCell("H10").border = thinBorder;

      ws.mergeCells("A12:D12");
      ws.getCell("A12").value = "Received by: {{received_by_name}} ({{received_by_designation}})";
      ws.getCell("A12").font = boldText;

      ws.mergeCells("E12:H12");
      ws.getCell("E12").value = "Issued by: {{issued_by_name}} ({{issued_by_designation}})";
      ws.getCell("E12").font = boldText;
      break;
    }
  }

  return wb;
}

// ============================================================================
// TEMPLATE PARSER: EXTRACTS PLACEHOLDERS, STYLES, AND SHEETS FROM UPLOADED XLSX
// ============================================================================
export interface ParsedTemplateInfo {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  placeholdersDetected: string[];
  repeatingItemRowIndex: number | null;
  base64: string;
}

export async function parseExcelTemplate(buffer: Buffer): Promise<ParsedTemplateInfo> {
  const mod = (ExcelJS as any).default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The uploaded Excel workbook contains no worksheets.");

  const placeholders = new Set<string>();
  let repeatingItemRowIndex: number | null = null;

  ws.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    let hasItemToken = false;
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      const text = cell.text ?? String(cell.value ?? "");
      const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
      if (matches) {
        matches.forEach((m: string) => {
          placeholders.add(m);
          if (m === "{{item_no}}" || m === "{{item_desc}}" || m === "{{unit_cost}}") {
            hasItemToken = true;
          }
        });
      }
    });
    if (hasItemToken && repeatingItemRowIndex === null) {
      repeatingItemRowIndex = rowNumber;
    }
  });

  return {
    sheetName: ws.name,
    rowCount: ws.rowCount,
    columnCount: ws.columnCount,
    placeholdersDetected: Array.from(placeholders),
    repeatingItemRowIndex,
    base64: buffer.toString("base64"),
  };
}

// ============================================================================
// DYNAMIC DATA INJECTION ENGINE: INJECTS TRANSACTION DATA INTO EXCEL TEMPLATE
// ============================================================================
export interface InjectedDocumentResult {
  xlsxBuffer: Buffer;
  xlsxBase64: string;
  htmlTable: string;
  sheetName: string;
  meta: {
    injectedTokensCount: number;
    itemsCount: number;
    templateKey: FormTemplateKey;
  };
}

export async function injectDataIntoExcelTemplate(
  templateBuffer: Buffer,
  templateKey: FormTemplateKey,
  data: Record<string, any>
): Promise<InjectedDocumentResult> {
  const mod = (ExcelJS as any).default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  await wb.xlsx.load(templateBuffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in template");

  let injectedTokensCount = 0;
  const items: Array<Record<string, any>> = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : (getSampleFormData(templateKey).items || []);

  // 1. Locate repeating item row if present
  let templateItemRowNumber: number | null = null;
  ws.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    if (templateItemRowNumber !== null) return;
    row.eachCell((cell: any) => {
      const text = cell.text ?? String(cell.value ?? "");
      if (text.includes("{{item_no}}") || text.includes("{{item_desc}}")) {
        templateItemRowNumber = rowNumber;
      }
    });
  });

  // 2. Clone repeating row for all transaction items if present
  if (templateItemRowNumber !== null && items.length > 0) {
    const templateRow = ws.getRow(templateItemRowNumber);
    const templateCellFormats: Array<{
      font: any;
      alignment: any;
      border: any;
      fill: any;
      numFmt: any;
      templateText: string;
    }> = [];

    const colCount = Math.max(ws.columnCount, 8);
    for (let c = 1; c <= colCount; c++) {
      const cell = templateRow.getCell(c);
      templateCellFormats.push({
        font: cell.font ? { ...cell.font } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        numFmt: cell.numFmt,
        templateText: cell.text ?? String(cell.value ?? ""),
      });
    }

    // Insert extra blank rows after templateItemRowNumber
    if (items.length > 1) {
      ws.spliceRows(templateItemRowNumber + 1, 0, ...new Array(items.length - 1).fill([]));
    }

    // Populate each row with item data
    items.forEach((item, itemIdx) => {
      const currentRow = ws.getRow(templateItemRowNumber! + itemIdx);
      templateCellFormats.forEach((fmt, colIdx) => {
        const cell = currentRow.getCell(colIdx + 1);
        let cellVal = fmt.templateText;
        Object.entries(item).forEach(([k, v]) => {
          const placeholder = `{{${k}}}`;
          if (cellVal.includes(placeholder)) {
            cellVal = cellVal.replace(placeholder, v === null || v === undefined ? "" : String(v));
            injectedTokensCount++;
          }
        });

        cell.value = cellVal;
        if (fmt.font) cell.font = fmt.font;
        if (fmt.alignment) cell.alignment = fmt.alignment;
        if (fmt.border) cell.border = fmt.border;
        if (fmt.fill) cell.fill = fmt.fill;
        if (fmt.numFmt) cell.numFmt = fmt.numFmt;
      });
    });
  }

  // 3. Inject scalar placeholders throughout the entire worksheet
  ws.eachRow({ includeEmpty: false }, (row: any) => {
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      const text = cell.text ?? String(cell.value ?? "");
      if (typeof text === "string" && text.includes("{{")) {
        let updated = text;
        Object.entries(data).forEach(([key, val]) => {
          if (key === "items") return;
          const token = `{{${key}}}`;
          if (updated.includes(token)) {
            updated = updated.replace(token, val === null || val === undefined ? "—" : String(val));
            injectedTokensCount++;
          }
        });
        // Clear unreplaced tokens cleanly with a dash or empty string
        updated = updated.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "—");
        cell.value = updated;
      }
    });
  });

  const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());
  const htmlTable = convertWorksheetToHtml(ws);

  return {
    xlsxBuffer,
    xlsxBase64: xlsxBuffer.toString("base64"),
    htmlTable,
    sheetName: ws.name,
    meta: {
      injectedTokensCount,
      itemsCount: items.length,
      templateKey,
    },
  };
}

// ============================================================================
// HTML CONVERTER: CONVERTS EXCEL WORKSHEET TO A CLEAN, ACCURATE A4 PRINTABLE HTML TABLE
// ============================================================================
function convertWorksheetToHtml(ws: ExcelJS.Worksheet): string {
  const mergedMap = new Map<string, { rowspan: number; colspan: number }>();
  const skipCells = new Set<string>();

  // Process merged cells
  if ((ws as any)._merges) {
    const merges = (ws as any)._merges;
    Object.keys(merges).forEach((key) => {
      const range = merges[key];
      const model = range.model;
      if (model) {
        const { top, bottom, left, right } = model;
        const rowspan = bottom - top + 1;
        const colspan = right - left + 1;
        const masterKey = `${top}:${left}`;
        mergedMap.set(masterKey, { rowspan, colspan });

        for (let r = top; r <= bottom; r++) {
          for (let c = left; c <= right; c++) {
            if (!(r === top && c === left)) {
              skipCells.add(`${r}:${c}`);
            }
          }
        }
      }
    });
  }

  const rowsHtml: string[] = [];
  const maxCols = Math.max(ws.columnCount, 6);

  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cellsHtml: string[] = [];
    let hasContentInRow = false;

    for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
      const cellKey = `${rowNumber}:${colNumber}`;
      if (skipCells.has(cellKey)) {
        continue;
      }

      const cell = row.getCell(colNumber);
      const val = cell.text ?? String(cell.value ?? "");
      if (val.trim()) hasContentInRow = true;

      const mergeInfo = mergedMap.get(cellKey);
      const spanAttrs = mergeInfo
        ? `${mergeInfo.rowspan > 1 ? ` rowspan="${mergeInfo.rowspan}"` : ""}${mergeInfo.colspan > 1 ? ` colspan="${mergeInfo.colspan}"` : ""}`
        : "";

      // Style extraction
      const styles: string[] = [];

      // Borders
      if (cell.border) {
        if (cell.border.top) styles.push("border-top: 1px solid #202833");
        if (cell.border.bottom) styles.push("border-bottom: 1px solid #202833");
        if (cell.border.left) styles.push("border-left: 1px solid #202833");
        if (cell.border.right) styles.push("border-right: 1px solid #202833");
      }

      // Font styles
      if (cell.font) {
        if (cell.font.bold) styles.push("font-weight: 700");
        if (cell.font.italic) styles.push("font-style: italic");
        if (cell.font.size) {
          const pt = Math.max(cell.font.size, 8);
          styles.push(`font-size: ${pt}pt`);
        }
        if (cell.font.color && (cell.font.color as any).argb) {
          const argb = (cell.font.color as any).argb;
          const hex = `#${argb.slice(2)}`;
          styles.push(`color: ${hex}`);
        }
      }

      // Alignment
      if (cell.alignment) {
        if (cell.alignment.horizontal) styles.push(`text-align: ${cell.alignment.horizontal}`);
        if (cell.alignment.vertical) styles.push(`vertical-align: ${cell.alignment.vertical}`);
      }

      // Background fill
      if (cell.fill && cell.fill.type === "pattern" && (cell.fill as any).fgColor?.argb) {
        const argb = (cell.fill as any).fgColor.argb;
        styles.push(`background-color: #${argb.slice(2)}`);
      }

      // Column padding
      styles.push("padding: 4px 6px");

      const styleStr = styles.length ? ` style="${styles.join("; ")}"` : "";
      cellsHtml.push(`<td${spanAttrs}${styleStr}>${escapeHtml(val)}</td>`);
    }

    if (hasContentInRow || rowNumber <= 20) {
      rowsHtml.push(`<tr>${cellsHtml.join("")}</tr>`);
    }
  });

  return `
    <table class="excel-rendered-table w-full border-collapse text-xs" style="table-layout: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.35; color: #202833;">
      <tbody>
        ${rowsHtml.join("\n")}
      </tbody>
    </table>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return "&nbsp;";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br/>");
}
