import { normalizeProcurementRole, type PersistedUserRole } from "../../../shared/procurementRules";

export function getNotificationDestination(entityType: string, assignedRole: string) {
  const role = normalizeProcurementRole(assignedRole as PersistedUserRole);
  const isOfficer = role === "procurement_officer";

  switch (entityType) {
    case "purchase_request":
      if (isOfficer) return "/officer/pr-verification";
      if (role === "procurement_staff") return "/pmr-registry";
      return "/purchase-requests";
    case "rfq":
    case "rfq_distribution":
      if (isOfficer) return "/officer/rfq-distribution";
      return role === "procurement_staff" ? "/rfq-management" : "/rfq";
    case "pre_canvass":
      return role === "end_user" ? "/rfq" : "/rfq-management";
    case "abstract_of_canvass":
    case "quotation_abstract":
      return "/purchase-orders";
    case "bac_transmittal":
      return "/officer/transmittals";
    case "letter_of_notice":
      return isOfficer ? "/officer/notices-serving" : "/officer/notices";
    case "purchase_order":
      return isOfficer ? "/officer/releasing" : "/purchase-orders";
    case "delivery":
    case "delivery_receipt":
      if (isOfficer) return "/officer/delivery-monitoring";
      return role === "end_user" ? "/supplier-evaluation-form" : "/purchase-orders";
    case "pmr_log":
      return "/pmr-registry";
    case "supplier_evaluation":
      return role === "end_user" ? "/supplier-evaluation-form" : "/supplier-evaluations";
    case "app_ppmp_entry":
      return "/plans";
    case "procurement_catalog_item":
      return "/catalog";
    default:
      return "/notifications";
  }
}