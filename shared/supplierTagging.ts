export type SupplierTagAssignment = { supplierId: number; supplierTagId: number };

export function filterSuppliersByTag<T extends { id: number }>(suppliers: T[], assignments: SupplierTagAssignment[], tagId: number | null) {
  if (tagId === null) return suppliers;
  const matchingSupplierIds = assignments.filter((assignment) => assignment.supplierTagId === tagId).map((assignment) => assignment.supplierId);
  return suppliers.filter((supplier) => matchingSupplierIds.includes(supplier.id));
}
