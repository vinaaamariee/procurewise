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
      { token: "{{entity_name}}", label: "Entity / Institution Name", example: "[Agency / Institution Name]", description: "Official name of the procuring entity or government agency" },
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "System generated Purchase Request tracking number" },
      { token: "{{office}}", label: "Office / Department", example: "[Office / Department]", description: "Requesting department or operating unit" },
      { token: "{{date}}", label: "Request Date", example: "March 26, 2026", description: "Official requisition submission date" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding source / GAA allotment" },
      { token: "{{responsibility_code}}", label: "Responsibility Center Code", example: "RESP-CENTER-001", description: "Accounting responsibility center" },
      { token: "{{purpose}}", label: "Purpose", example: "Procurement of office and operational supplies for 1st Quarter", description: "Justification and requisition purpose" },
      { token: "{{abc_amount}}", label: "Total ABC Amount", example: "₱145,250.00", description: "Approved Budget for the Contract total" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Forty-Five Thousand Two Hundred Fifty Pesos Only", description: "Spelled-out total monetary value" },
      { token: "{{signatory_1_name}}", label: "Requested By (Name)", example: "Maria Santos", description: "End-user requisitioner full name" },
      { token: "{{signatory_1_title}}", label: "Requested By (Title)", example: "Unit Head / Division Chief", description: "Requisitioner official position" },
      { token: "{{signatory_2_name}}", label: "Approved By (Name)", example: "Roberto C. Reyes", description: "Authorizing administrative official" },
      { token: "{{signatory_2_title}}", label: "Approved By (Title)", example: "Head of Procuring Entity (HoPE)", description: "Authorizing official title" },
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
      { token: "{{entity_name}}", label: "Entity / Institution Name", example: "[Agency / Institution Name]", description: "Official name of the procuring entity" },
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Official Request for Quotation sequence code" },
      { token: "{{pr_no}}", label: "Associated PR No.", example: "PR-2026-03-014", description: "Linked Purchase Request identification" },
      { token: "{{date}}", label: "Issuance Date", example: "March 26, 2026", description: "Date of RFQ transmission" },
      { token: "{{deadline}}", label: "Submission Deadline", example: "April 02, 2026 (5:00 PM)", description: "Deadline for supplier quotation submission" },
      { token: "{{delivery_term}}", label: "Delivery Period", example: "15 Calendar Days", description: "Required days to deliver post-PO" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "[Agency / Institution Name] Supply Office", description: "Designated receiving location" },
      { token: "{{supplier_name}}", label: "Supplier / Bidder Name", example: "Universal Commercial Supplies", description: "Name of invited or responding supplier" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "123 Commercial Avenue, City Center", description: "Supplier business address" },
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
      { token: "{{entity_name}}", label: "Entity / Institution Name", example: "[Agency / Institution Name]", description: "Official name of the procuring entity" },
      { token: "{{aoq_no}}", label: "Abstract Number", example: "AOQ-2026-03-042", description: "Official BAC Abstract identification" },
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Associated quotation canvass reference" },
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "Originating Purchase Request number" },
      { token: "{{date}}", label: "Opening Date", example: "April 03, 2026", description: "Date of official canvass opening" },
      { token: "{{opening_location}}", label: "Opening Location", example: "BAC Conference Room, [Agency / Institution Name]", description: "Canvass opening room" },
      { token: "{{abc_amount}}", label: "Approved Budget (ABC)", example: "₱145,250.00", description: "Approved budget threshold" },
      { token: "{{recommended_supplier}}", label: "Recommended Awardee", example: "Universal Commercial Supplies", description: "Supplier evaluated as lowest calculated compliant bid" },
      { token: "{{awarded_amount}}", label: "Awarded Contract Total", example: "₱138,400.00", description: "Recommended contract price" },
      { token: "{{savings}}", label: "Government Savings", example: "₱6,850.00", description: "Difference between ABC and Awarded Amount" },
      { token: "{{recommendation_reason}}", label: "Evaluation Basis / Reason", example: "Lowest calculated responsive quotation complying with all specifications.", description: "Justification for award recommendation" },
      { token: "{{bac_chairperson}}", label: "BAC Chairperson", example: "Elena G. Martinez", description: "Chairperson of Bids and Awards Committee" },
      { token: "{{bac_vice_chair}}", label: "BAC Vice-Chairperson", example: "Leo V. Fernandez", description: "Vice-Chairperson of BAC" },
      { token: "{{bac_members}}", label: "BAC Members", example: "Clara Ramos, Samuel Cruz", description: "Participating BAC Committee Members" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Item sequence number" },
      { token: "{{item_desc}}", label: "Item Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Article or commodity specification" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Measurement unit" },
      { token: "{{supplier_1_name}}", label: "Supplier 1 Name", example: "Universal Commercial Supplies", description: "First evaluated bidder name" },
      { token: "{{supplier_1_bid}}", label: "Supplier 1 Bid", example: "₱13,750.00", description: "First bidder total quote" },
      { token: "{{supplier_2_name}}", label: "Supplier 2 Name", example: "Standard Goods Enterprise", description: "Second evaluated bidder name" },
      { token: "{{supplier_2_bid}}", label: "Supplier 2 Bid", example: "₱14,100.00", description: "Second bidder total quote" },
      { token: "{{lowest_bidder}}", label: "Lowest Bidder for Item", example: "Universal Commercial Supplies", description: "Winning item offer" },
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
      { token: "{{entity_name}}", label: "Entity / Institution Name", example: "[Agency / Institution Name]", description: "Official name of the procuring entity" },
      { token: "{{po_no}}", label: "PO Number", example: "PO-2026-03-019", description: "Legally binding Purchase Order number" },
      { token: "{{date}}", label: "PO Date", example: "April 05, 2026", description: "Contract issuance date" },
      { token: "{{pr_no}}", label: "Linked PR Number", example: "PR-2026-03-014", description: "Associated Purchase Request" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Universal Commercial Supplies", description: "Awarded contractor business name" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "123 Commercial Avenue, City Center", description: "Contractor official address" },
      { token: "{{tin_no}}", label: "TIN", example: "123-456-789-000", description: "Taxpayer Identification Number" },
      { token: "{{philgeps_no}}", label: "PhilGEPS Registration No.", example: "2024-89312", description: "PhilGEPS merchant identification" },
      { token: "{{procurement_mode}}", label: "Mode of Procurement", example: "NP-53.9 Small Value Procurement", description: "RA 9184 statutory method" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "[Agency / Institution Name] Supply Office", description: "Physical delivery destination" },
      { token: "{{delivery_date}}", label: "Delivery Date", example: "Within 15 days upon receipt of NTP/PO", description: "Expected delivery deadline" },
      { token: "{{delivery_term}}", label: "Delivery Term", example: "FOB Destination", description: "Shipping and risk transfer term" },
      { token: "{{payment_term}}", label: "Payment Term", example: "Government Terms (Check / LDDAP upon inspection)", description: "Payment processing terms" },
      { token: "{{total_amount}}", label: "Total PO Amount", example: "₱138,400.00", description: "Total contract value in Philippine Peso" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Thirty-Eight Thousand Four Hundred Pesos Only", description: "Spelled out total amount" },
      { token: "{{authorized_official}}", label: "Authorized Official (HOPE)", example: "Roberto C. Reyes", description: "Head of Procuring Entity full name" },
      { token: "{{authorized_official_title}}", label: "HOPE Title", example: "Head of Procuring Entity (HoPE)", description: "Title of signing official" },
      { token: "{{accountant_name}}", label: "Chief Accountant", example: "Teresa M. Valiente, CPA", description: "Head of Accounting Unit certifying funds" },
      { token: "{{supplier_representative}}", label: "Supplier Conforme (Name)", example: "Arnold B. Gomez", description: "Authorized representative of contractor" },
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
      { token: "{{entity_name}}", label: "Entity / Institution Name", example: "[Agency / Institution Name]", description: "Official name of the procuring entity" },
      { token: "{{receipt_no}}", label: "Receipt / PAR No.", example: "AR-2026-04-007", description: "Property acknowledgement tracking number" },
      { token: "{{date}}", label: "Receipt Date", example: "April 18, 2026", description: "Date items were physically accepted" },
      { token: "{{po_no}}", label: "Linked PO Number", example: "PO-2026-03-019", description: "Originating Purchase Order" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Universal Commercial Supplies", description: "Delivering contractor" },
      { token: "{{receiving_office}}", label: "Receiving Office / Custodian", example: "[Office / Department]", description: "End-user office accepting property custody" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding code" },
      { token: "{{physical_location}}", label: "Physical Location", example: "Property Custodian Storage Facility", description: "Physical deployment area" },
      { token: "{{total_amount}}", label: "Total Asset Value", example: "₱138,400.00", description: "Cumulative valuation of accepted assets" },
      { token: "{{received_by_name}}", label: "Received By (Custodian)", example: "Maria Santos", description: "End-user custodian receiving property" },
      { token: "{{received_by_designation}}", label: "Custodian Title", example: "Property Custodian / End-User", description: "Custodian job designation" },
      { token: "{{received_date}}", label: "Received Date", example: "April 18, 2026", description: "Custodian signing date" },
      { token: "{{issued_by_name}}", label: "Issued By (Supply Officer)", example: "Michael D. Tan", description: "Property & Supply Officer" },
      { token: "{{issued_by_designation}}", label: "Supply Officer Title", example: "Administrative Officer V (Supply)", description: "Supply officer designation" },
      { token: "{{issued_date}}", label: "Issued Date", example: "April 18, 2026", description: "Issuing officer date" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Sequential index" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Accepted quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of issue" },
      { token: "{{item_desc}}", label: "Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Commodity description" },
      { token: "{{property_no}}", label: "Property / Inventory Tag No.", example: "PROP-TAG-2026-0041", description: "Institutional inventory sticker number" },
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
    { item_no: 1, unit: "ream", item_desc: "Multi-purpose Bond Paper A4 (70gsm, 500 sheets/ream)", qty: 50, unit_cost: "₱285.00", total_cost: "₱14,250.00", property_no: "PROP-TAG-2026-001", date_acquired: "2026-04-15" },
    { item_no: 2, unit: "cartridge", item_desc: "Original HP Toner Cartridge 85A Black", qty: 4, unit_cost: "₱3,450.00", total_cost: "₱13,800.00", property_no: "PROP-TAG-2026-002", date_acquired: "2026-04-15" },
    { item_no: 3, unit: "unit", item_desc: "Heavy-Duty 2-Hole Paper Puncher (Metal Chassis)", qty: 6, unit_cost: "₱750.00", total_cost: "₱4,500.00", property_no: "PROP-TAG-2026-003", date_acquired: "2026-04-15" },
    { item_no: 4, unit: "box", item_desc: "Permanent Marker Pen (Black, Fine Bullet Tip, 12s)", qty: 10, unit_cost: "₱420.00", total_cost: "₱4,200.00", property_no: "PROP-TAG-2026-004", date_acquired: "2026-04-15" },
    { item_no: 5, unit: "unit", item_desc: "Uninterruptible Power Supply (UPS 650VA / 360W)", qty: 8, unit_cost: "₱3,200.00", total_cost: "₱25,600.00", property_no: "PROP-TAG-2026-005", date_acquired: "2026-04-15" },
  ];

  switch (key) {
    case "purchase_request":
      return {
        entity_name: "[Agency / Institution Name]",
        pr_no: "PR-2026-03-014",
        office: "[Office / Department]",
        date: "March 26, 2026",
        fund_cluster: "Regular Agency Fund (01101101)",
        responsibility_code: "RESP-CENTER-001",
        purpose: "Urgent procurement of standard office, printing, and operational supplies for 1st Semester operations.",
        abc_amount: "₱62,350.00",
        amount_in_words: "Sixty-Two Thousand Three Hundred Fifty Pesos Only",
        signatory_1_name: "Maria Santos",
        signatory_1_title: "Unit Head / Division Chief",
        signatory_2_name: "Roberto C. Reyes",
        signatory_2_title: "Head of Procuring Entity (HoPE)",
        items: commonItems,
      };

    case "rfq":
      return {
        entity_name: "[Agency / Institution Name]",
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "March 26, 2026",
        deadline: "April 02, 2026 (5:00 PM)",
        delivery_term: "15 Calendar Days",
        place_of_delivery: "[Agency / Institution Name] Supply Office",
        supplier_name: "Universal Commercial Supplies",
        supplier_address: "123 Commercial Avenue, City Center",
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
        entity_name: "[Agency / Institution Name]",
        aoq_no: "AOQ-2026-03-042",
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "April 03, 2026",
        opening_location: "BAC Conference Room, Administration Building, [Agency / Institution Name]",
        abc_amount: "₱62,350.00",
        recommended_supplier: "Universal Commercial Supplies",
        awarded_amount: "₱59,800.00",
        savings: "₱2,550.00",
        recommendation_reason: "Evaluated as the Lowest Calculated Responsive Quotation meeting all technical specifications and compliance criteria.",
        bac_chairperson: "Elena G. Martinez",
        bac_vice_chair: "Leo V. Fernandez",
        bac_members: "Clara Ramos, Samuel Cruz, Alan Perez",
        items: commonItems.map((item, idx) => ({
          ...item,
          supplier_1_name: "Universal Commercial Supplies",
          supplier_1_bid: item.total_cost,
          supplier_2_name: "Standard Goods Enterprise",
          supplier_2_bid: `₱${(Number(item.total_cost.replace(/[^0-9.]/g, "")) * 1.05).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          lowest_bidder: "Universal Commercial Supplies",
        })),
      };

    case "purchase_order":
      return {
        entity_name: "[Agency / Institution Name]",
        po_no: "PO-2026-03-019",
        date: "April 05, 2026",
        pr_no: "PR-2026-03-014",
        supplier_name: "Universal Commercial Supplies",
        supplier_address: "123 Commercial Avenue, City Center",
        tin_no: "123-456-789-000",
        philgeps_no: "2024-89312",
        procurement_mode: "NP-53.9 Small Value Procurement (RA 9184)",
        place_of_delivery: "[Agency / Institution Name] Supply Office",
        delivery_date: "Within 15 days upon receipt of PO",
        delivery_term: "FOB Destination",
        payment_term: "Government Terms (Check / LDDAP after final inspection)",
        total_amount: "₱59,800.00",
        amount_in_words: "Fifty-Nine Thousand Eight Hundred Pesos Only",
        authorized_official: "Roberto C. Reyes",
        authorized_official_title: "Head of Procuring Entity (HoPE)",
        accountant_name: "Teresa M. Valiente, CPA",
        supplier_representative: "Arnold B. Gomez",
        items: commonItems,
      };

    case "acknowledgement_receipt":
      return {
        entity_name: "[Agency / Institution Name]",
        receipt_no: "AR-2026-04-007",
        date: "April 18, 2026",
        po_no: "PO-2026-03-019",
        supplier_name: "Universal Commercial Supplies",
        receiving_office: "[Office / Department]",
        fund_cluster: "Regular Agency Fund (01101101)",
        physical_location: "Property Custodian Storage Facility",
        total_amount: "₱59,800.00",
        received_by_name: "Maria Santos",
        received_by_designation: "Property Custodian / End-User",
        received_date: "April 18, 2026",
        issued_by_name: "Michael D. Tan",
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
        { width: 14 }, // A: Stock/Property No.
        { width: 10 }, // B: Unit
        { width: 36 }, // C: Item Description
        { width: 12 }, // D: Quantity
        { width: 14 }, // E: Unit Cost
        { width: 14 }, // F: Total Cost
      ];

      const plain: Partial<ExcelJS.Font> = { name: "Arial", size: 9, color: { argb: "FF000000" } };
      const plainBold: Partial<ExcelJS.Font> = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
      const plainBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
      const bottomOnly: Partial<ExcelJS.Borders> = {
        bottom: { style: "thin", color: { argb: "FF000000" } },
      };
      const alignCenter: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };
      const alignLeft: Partial<ExcelJS.Alignment> = { horizontal: "left", vertical: "middle" };
      const alignRight: Partial<ExcelJS.Alignment> = { horizontal: "right", vertical: "middle" };

      // ── Row 1: "Appendix 60" label top-right ──
      ws.getRow(1).height = 14;
      ws.getCell("F1").value = "Appendix 60";
      ws.getCell("F1").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF000000" } };
      ws.getCell("F1").alignment = alignRight;

      // ── Row 2-3: blank spacers ──
      ws.getRow(2).height = 8;
      ws.getRow(3).height = 8;

      // ── Row 4: PURCHASE REQUEST title ──
      ws.mergeCells("A4:F4");
      ws.getCell("A4").value = "PURCHASE REQUEST";
      ws.getCell("A4").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF000000" } };
      ws.getCell("A4").alignment = alignCenter;
      ws.getRow(4).height = 20;

      // ── Row 5: Entity Name + Fund Cluster ──
      ws.getRow(5).height = 16;
      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = plain;
      ws.getCell("A5").border = plainBorder;
      ws.mergeCells("B5:C5");
      ws.getCell("B5").value = "{{entity_name}}";
      ws.getCell("B5").font = plain;
      ws.getCell("B5").border = plainBorder;
      ws.getCell("D5").value = "Fund Cluster:";
      ws.getCell("D5").font = plain;
      ws.getCell("D5").border = plainBorder;
      ws.mergeCells("E5:F5");
      ws.getCell("E5").value = "{{fund_cluster}}";
      ws.getCell("E5").font = plain;
      ws.getCell("E5").border = plainBorder;

      // ── Row 6: Office/Section + PR No. + Date ──
      ws.getRow(6).height = 16;
      ws.getCell("A6").value = "Office/Section:";
      ws.getCell("A6").font = plain;
      ws.getCell("A6").border = plainBorder;
      ws.getCell("B6").value = "{{office}}";
      ws.getCell("B6").font = plain;
      ws.getCell("B6").border = plainBorder;
      ws.getCell("C6").value = "PR No.:";
      ws.getCell("C6").font = plain;
      ws.getCell("C6").border = plainBorder;
      ws.getCell("D6").value = "{{pr_no}}";
      ws.getCell("D6").font = plain;
      ws.getCell("D6").border = plainBorder;
      ws.getCell("E6").value = "Date:";
      ws.getCell("E6").font = plain;
      ws.getCell("E6").border = plainBorder;
      ws.getCell("F6").value = "{{date}}";
      ws.getCell("F6").font = plain;
      ws.getCell("F6").border = plainBorder;

      // ── Row 7: Responsibility Center Code ──
      ws.getRow(7).height = 16;
      ws.mergeCells("A7:B7");
      ws.getCell("A7").value = "Responsibility Center Code:";
      ws.getCell("A7").font = plain;
      ws.getCell("A7").border = plainBorder;
      ws.mergeCells("C7:F7");
      ws.getCell("C7").value = "{{responsibility_code}}";
      ws.getCell("C7").font = plain;
      ws.getCell("C7").border = plainBorder;

      // ── Row 8: Column Headers ──
      const prColHeaders = ["Stock/ Property\nNo.", "Unit", "Item Description", "Quantity", "Unit\nCost", "Total Cost"];
      const prHeaderRow = ws.getRow(8);
      prHeaderRow.height = 30;
      prColHeaders.forEach((title, idx) => {
        const cell = prHeaderRow.getCell(idx + 1);
        cell.value = title;
        cell.font = plainBold;
        cell.border = plainBorder;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      // ── Row 9: token item row (injected during data fill) ──
      const prItemRow = ws.getRow(9);
      prItemRow.height = 16;
      prItemRow.getCell(1).value = "{{item_no}}";
      prItemRow.getCell(1).alignment = alignCenter;
      prItemRow.getCell(2).value = "{{unit}}";
      prItemRow.getCell(2).alignment = alignCenter;
      prItemRow.getCell(3).value = "{{item_desc}}";
      prItemRow.getCell(3).alignment = alignLeft;
      prItemRow.getCell(4).value = "{{qty}}";
      prItemRow.getCell(4).alignment = alignCenter;
      prItemRow.getCell(5).value = "{{unit_cost}}";
      prItemRow.getCell(5).alignment = alignRight;
      prItemRow.getCell(6).value = "{{total_cost}}";
      prItemRow.getCell(6).alignment = alignRight;
      for (let c = 1; c <= 6; c++) {
        prItemRow.getCell(c).border = plainBorder;
        prItemRow.getCell(c).font = plain;
      }

      // ── Rows 10–22: blank item rows ──
      for (let r = 10; r <= 22; r++) {
        const row = ws.getRow(r);
        row.height = 16;
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.value = "";
          cell.border = plainBorder;
          cell.font = plain;
        }
      }

      // ── Row 23: Purpose ──
      ws.getRow(23).height = 20;
      ws.mergeCells("A23:F23");
      ws.getCell("A23").value = "Purpose: {{purpose}}";
      ws.getCell("A23").font = plain;
      ws.getCell("A23").alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      ws.getCell("A23").border = plainBorder;

      // ── Row 24: blank spacer ──
      ws.getRow(24).height = 10;

      // ── Row 25: Requested by / Approved by labels ──
      ws.getRow(25).height = 16;
      ws.mergeCells("A25:C25");
      ws.getCell("A25").value = "Requested by:";
      ws.getCell("A25").font = plain;
      ws.getCell("A25").alignment = alignCenter;
      ws.mergeCells("D25:F25");
      ws.getCell("D25").value = "Approved by:";
      ws.getCell("D25").font = plain;
      ws.getCell("D25").alignment = alignCenter;

      // ── Row 26: blank ──
      ws.getRow(26).height = 14;

      // ── Row 27: Signature line ──
      ws.getRow(27).height = 16;
      ws.getCell("A27").value = "Signature :";
      ws.getCell("A27").font = plain;
      ws.mergeCells("B27:C27");
      ws.getCell("B27").value = "";
      ws.getCell("B27").border = bottomOnly;
      ws.getCell("D27").value = "Signature :";
      ws.getCell("D27").font = plain;
      ws.mergeCells("E27:F27");
      ws.getCell("E27").value = "";
      ws.getCell("E27").border = bottomOnly;

      // ── Row 28: Printed Name ──
      ws.getRow(28).height = 16;
      ws.getCell("A28").value = "Printed Name :";
      ws.getCell("A28").font = plain;
      ws.mergeCells("B28:C28");
      ws.getCell("B28").value = "{{signatory_1_name}}";
      ws.getCell("B28").font = plain;
      ws.getCell("B28").border = bottomOnly;
      ws.getCell("D28").value = "Printed Name :";
      ws.getCell("D28").font = plain;
      ws.mergeCells("E28:F28");
      ws.getCell("E28").value = "{{signatory_2_name}}";
      ws.getCell("E28").font = plain;
      ws.getCell("E28").border = bottomOnly;

      // ── Row 29: Designation ──
      ws.getRow(29).height = 16;
      ws.getCell("A29").value = "Designation :";
      ws.getCell("A29").font = plain;
      ws.mergeCells("B29:C29");
      ws.getCell("B29").value = "{{signatory_1_title}}";
      ws.getCell("B29").font = plain;
      ws.getCell("B29").border = bottomOnly;
      ws.getCell("D29").value = "Designation :";
      ws.getCell("D29").font = plain;
      ws.mergeCells("E29:F29");
      ws.getCell("E29").value = "{{signatory_2_title}}";
      ws.getCell("E29").font = plain;
      ws.getCell("E29").border = bottomOnly;

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
      ws.getCell("A1").value = "[AGENCY / INSTITUTION NAME] — PROCUREMENT UNIT";
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
      ws.getCell("A1").value = "[AGENCY / INSTITUTION NAME] — BIDS AND AWARDS COMMITTEE";
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
      ws.getCell("A2").value = "[AGENCY / INSTITUTION NAME]";
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
      ws.getCell("A2").value = "[AGENCY / INSTITUTION NAME]";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };

      ws.mergeCells("A3:H3");
      ws.getCell("A3").value = "ACKNOWLEDGEMENT RECEIPT FOR PROPERTY (PAR / ICS)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };

      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "{{entity_name}}";
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

export function getCellDisplayValue(cell: any): string {
  if (!cell) return "";
  if (cell.text !== undefined && cell.text !== null && typeof cell.text === "string") {
    return cell.text;
  }
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (val instanceof Date) return val.toLocaleDateString();
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) return String(val.result);
    if (Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || "").join("");
    }
    if (val.error) return String(val.error);
    if (val.text) return String(val.text);
    if (val.hyperlink && val.text) return String(val.text);
  }
  return "";
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
  if (!ws) {
    throw new Error("Invalid template: No worksheets found in the Excel workbook.");
  }

  let injectedTokensCount = 0;
  const items = Array.isArray(data.items) ? data.items : [];

  // 1. Locate repeating item row if present
  let templateItemRowNumber: number | null = null;
  ws.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    if (templateItemRowNumber !== null) return;
    row.eachCell((cell: any) => {
      const text = getCellDisplayValue(cell);
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

    const declaredCols = ws.columns && ws.columns.length > 0 ? ws.columns.length : 0;
    const colCount = Math.max(declaredCols, ws.actualColumnCount, 1);
    for (let c = 1; c <= colCount; c++) {
      const cell = templateRow.getCell(c);
      templateCellFormats.push({
        font: cell.font ? { ...cell.font } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        numFmt: cell.numFmt,
        templateText: getCellDisplayValue(cell),
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
  const normalizedData: Record<string, any> = {
    entity_name: "[Agency / Institution Name]",
    ...data,
  };

  ws.eachRow({ includeEmpty: false }, (row: any) => {
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      const text = getCellDisplayValue(cell);
      if (typeof text === "string" && text.includes("{{")) {
        let updated = text;
        Object.entries(normalizedData).forEach(([key, val]) => {
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

  // Process merged cells with safety guard
  if ((ws as any)._merges) {
    try {
      const merges = (ws as any)._merges;
      Object.keys(merges).forEach((key) => {
        const range = merges[key];
        const model = range?.model || range;
        if (
          model &&
          typeof model.top === "number" &&
          typeof model.bottom === "number" &&
          typeof model.left === "number" &&
          typeof model.right === "number"
        ) {
          const { top, bottom, left, right } = model;
          const rowspan = Math.max(1, bottom - top + 1);
          const colspan = Math.max(1, right - left + 1);
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
    } catch {
      // Safe fallback if worksheet merge structure is irregular
    }
  }

  const rowsHtml: string[] = [];
  const declaredCols = ws.columns && ws.columns.length > 0 ? ws.columns.length : 0;
  const maxCols = Math.max(declaredCols, ws.actualColumnCount, 1);
  const totalRows = Math.min(Math.max(ws.rowCount, ws.actualRowCount, 20), 120);

  for (let rowNumber = 1; rowNumber <= totalRows; rowNumber++) {
    const row = ws.getRow(rowNumber);
    const cellsHtml: string[] = [];
    let hasContentInRow = false;

    for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
      const cellKey = `${rowNumber}:${colNumber}`;
      if (skipCells.has(cellKey)) {
        continue;
      }

      const cell = row.getCell(colNumber);
      const val = getCellDisplayValue(cell);
      if (val.trim()) hasContentInRow = true;

      const mergeInfo = mergedMap.get(cellKey);
      const spanAttrs = mergeInfo
        ? `${mergeInfo.rowspan > 1 ? ` rowspan="${mergeInfo.rowspan}"` : ""}${mergeInfo.colspan > 1 ? ` colspan="${mergeInfo.colspan}"` : ""}`
        : "";

      // Style extraction
      const styles: string[] = [];

      // Borders
      if (cell.border) {
        if (cell.border.top) styles.push("border-top: 1px solid #1e293b");
        if (cell.border.bottom) styles.push("border-bottom: 1px solid #1e293b");
        if (cell.border.left) styles.push("border-left: 1px solid #1e293b");
        if (cell.border.right) styles.push("border-right: 1px solid #1e293b");
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

    if (hasContentInRow || rowNumber <= 15) {
      rowsHtml.push(`<tr>${cellsHtml.join("")}</tr>`);
    }
  }

  return `
    <table class="excel-rendered-table w-full border-collapse text-xs" style="table-layout: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.35; color: #1e293b;">
      <tbody>
        ${rowsHtml.join("\n")}
      </tbody>
    </table>
  `;
}

export function generateResilientHtmlPreview(templateKey: string, data: Record<string, any>): string {
  const entityName = data.entity_name || "[Agency / Institution Name]";
  const items = Array.isArray(data.items) ? data.items : [];
  const meta = SUPPORTED_FORM_TEMPLATES[templateKey as FormTemplateKey];
  const title = meta?.displayName || "PROCUREMENT DOCUMENT";

  const rowsHtml = items.map((it: any) => `
    <tr>
      <td style="border: 1px solid #1e293b; padding: 6px; text-align: center;">${escapeHtml(String(it.item_no || "1"))}</td>
      <td style="border: 1px solid #1e293b; padding: 6px; text-align: center;">${escapeHtml(String(it.unit || "unit"))}</td>
      <td style="border: 1px solid #1e293b; padding: 6px;">${escapeHtml(String(it.item_desc || "Item description"))}</td>
      <td style="border: 1px solid #1e293b; padding: 6px; text-align: right;">${escapeHtml(String(it.quantity || "1"))}</td>
      <td style="border: 1px solid #1e293b; padding: 6px; text-align: right;">${escapeHtml(String(it.unit_cost || it.unit_price || "0.00"))}</td>
      <td style="border: 1px solid #1e293b; padding: 6px; text-align: right; font-weight: 600;">${escapeHtml(String(it.total_cost || it.total_price || "0.00"))}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 16px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; font-style: italic; color: #64748b;">Republic of the Philippines</div>
        <div style="font-size: 16px; font-weight: 800; color: #7B1E1E; margin: 4px 0;">${escapeHtml(entityName)}</div>
        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(title)}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <div><strong>Entity Name:</strong> ${escapeHtml(entityName)}</div>
        <div><strong>Document Reference:</strong> ${escapeHtml(String(data.pr_no || data.rfq_no || data.po_no || data.aoq_no || "—"))}</div>
        <div><strong>Office / Section:</strong> ${escapeHtml(String(data.office || "[Office / Department]"))}</div>
        <div><strong>Date:</strong> ${escapeHtml(String(data.date || new Date().toISOString().split("T")[0]))}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: 700;">
            <th style="border: 1px solid #1e293b; padding: 6px; width: 60px;">Item No.</th>
            <th style="border: 1px solid #1e293b; padding: 6px; width: 60px;">Unit</th>
            <th style="border: 1px solid #1e293b; padding: 6px;">Description</th>
            <th style="border: 1px solid #1e293b; padding: 6px; width: 70px;">Qty</th>
            <th style="border: 1px solid #1e293b; padding: 6px; width: 100px;">Unit Cost</th>
            <th style="border: 1px solid #1e293b; padding: 6px; width: 110px;">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" style="border: 1px solid #1e293b; padding: 12px; text-align: center; color: #64748b;">Standard template with dynamic rows</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="font-weight: 700; background: #fafafa;">
            <td colspan="5" style="border: 1px solid #1e293b; padding: 6px; text-align: right;">Total Amount:</td>
            <td style="border: 1px solid #1e293b; padding: 6px; text-align: right; color: #7B1E1E;">${escapeHtml(String(data.total_abc || data.total_amount || "0.00"))}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
        <div>
          <div style="color: #64748b; margin-bottom: 24px;">Requested / Prepared by:</div>
          <div style="font-weight: 700; border-top: 1px solid #334155; padding-top: 4px;">${escapeHtml(String(data.requestor_name || "[Authorized End-User]"))}</div>
          <div style="color: #64748b;">${escapeHtml(String(data.requestor_designation || "[Designation]"))}</div>
        </div>
        <div>
          <div style="color: #64748b; margin-bottom: 24px;">Approved by:</div>
          <div style="font-weight: 700; border-top: 1px solid #334155; padding-top: 4px;">${escapeHtml(String(data.approver_name || "[Head of Procuring Entity / Approver]"))}</div>
          <div style="color: #64748b;">${escapeHtml(String(data.approver_designation || "[Designation]"))}</div>
        </div>
      </div>
    </div>
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
