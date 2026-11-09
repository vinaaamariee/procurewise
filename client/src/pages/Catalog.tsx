import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import {
  CheckCircle2,
  Heart,
  Info,
  LoaderCircle,
  PackagePlus,
  PackageSearch,
  Plus,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type SortOption = "description" | "code" | "reference_low" | "reference_high";
type SavedSelection = { id: number; productCode: string; description: string; unit: string; quantity: string; referencePrice: string };

const STANDARD_UNITS = [
  "Bundle",
  "Piece",
  "Box",
  "Roll",
  "Ream",
  "Set",
  "Unit",
  "Pack",
  "Can",
  "Bottle",
  "Pad",
  "Book",
  "Meter",
  "Lot",
  "Jar",
  "Pair",
];

export default function CatalogPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const normalizedRole = normalizeProcurementRole(user?.role || "end_user");
  const isOfficerOrStaff =
    normalizedRole === "procurement_officer" ||
    normalizedRole === "procurement_staff" ||
    normalizedRole === "admin";
  const isEndUser = normalizedRole === "end_user";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [codeFamily, setCodeFamily] = useState("all");
  const [minReference, setMinReference] = useState("");
  const [maxReference, setMaxReference] = useState("");
  const [sort, setSort] = useState<SortOption>("description");
  const [savedSelection, setSavedSelection] = useState<SavedSelection[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Dialog state for PO & Staff item creation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [technicalSpecs, setTechnicalSpecs] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("Piece");
  const [customUnit, setCustomUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [designatedSupplierId, setDesignatedSupplierId] = useState("");
  const [customProductCode, setCustomProductCode] = useState("");
  const [itemRemarks, setItemRemarks] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryInput = useMemo(
    () => ({ search: debouncedSearch.trim() || undefined, codeFamily: codeFamily === "all" ? undefined : codeFamily, page: 1, limit: 100 }),
    [debouncedSearch, codeFamily]
  );

  const catalog = trpc.procurement.catalog.list.useQuery(queryInput, { retry: false });
  const families = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const savedItems = trpc.procurement.catalog.saved.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });

  const utils = trpc.useUtils();

  const saveCart = trpc.procurement.catalog.save.useMutation({
    onError: (error) => toast.error(`Saved selection could not be synchronized: ${error.message}`),
  });
  const clearSavedCart = trpc.procurement.catalog.clearSaved.useMutation({
    onError: (error) => toast.error(`Saved selection could not be cleared: ${error.message}`),
  });
  const setFavorite = trpc.procurement.catalog.setFavorite.useMutation({
    onSuccess: () => void utils.procurement.catalog.favorites.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const createItemMutation = trpc.procurement.catalog.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Catalog item "${data.description}" registered successfully.`);
      setIsCreateOpen(false);
      resetCreateForm();
      void utils.procurement.catalog.list.invalidate();
      void utils.procurement.catalog.codeFamilies.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create catalog item.");
    },
  });

  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.id)), [favorites.data]);

  useEffect(() => {
    if (!savedItems.isSuccess) return;
    setSavedSelection(
      (savedItems.data ?? []).map((item) => ({
        id: item.catalogItemId,
        productCode: item.productCode,
        description: item.description,
        unit: item.unit || "",
        quantity: String(item.quantity),
        referencePrice: String(item.referencePrice),
      }))
    );
  }, [savedItems.data, savedItems.isSuccess]);

  const filteredItems = useMemo(() => {
    const min = minReference === "" ? 0 : Number(minReference);
    const max = maxReference === "" ? Number.POSITIVE_INFINITY : Number(maxReference);
    const query = debouncedSearch.trim().toLowerCase();
    return [...(catalog.data?.items ?? [])]
      .filter((item) => {
        const price = Number(item.referencePrice);
        if (price < min || price > max) return false;
        if (query) {
          const matchDesc = item.description?.toLowerCase().includes(query);
          const matchCode = item.productCode?.toLowerCase().includes(query);
          if (!matchDesc && !matchCode) return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sort === "code") return left.productCode.localeCompare(right.productCode, undefined, { numeric: true });
        if (sort === "reference_low") return Number(left.referencePrice) - Number(right.referencePrice);
        if (sort === "reference_high") return Number(right.referencePrice) - Number(left.referencePrice);
        return left.description.localeCompare(right.description);
      });
  }, [catalog.data?.items, minReference, maxReference, sort, debouncedSearch]);

  const selectedIds = useMemo(() => new Set(savedSelection.map((item) => item.id)), [savedSelection]);

  const persistSavedSelection = (next: SavedSelection[]) => {
    setSavedSelection(next);
    saveCart.mutate({ items: next.map((item) => ({ catalogItemId: item.id, quantity: Number(item.quantity) || 1 })) });
  };

  const toggleSelection = (
    item: { id: number; productCode: string; description: string; unit: string | null; referencePrice: string },
    checked: boolean
  ) =>
    setSavedSelection((current) => {
      const next = checked
        ? current.some((saved) => saved.id === item.id)
          ? current
          : [...current, { id: item.id, productCode: item.productCode, description: item.description, unit: item.unit || "", quantity: "1", referencePrice: item.referencePrice }]
        : current.filter((saved) => saved.id !== item.id);
      persistSavedSelection(next);
      return next;
    });

  const updateQuantity = (id: number, quantity: string) =>
    setSavedSelection((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, quantity } : item));
      persistSavedSelection(next);
      return next;
    });

  const clearAll = () => {
    setSavedSelection([]);
    clearSavedCart.mutate();
    toast.success("Saved catalog selection cleared.");
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCodeFamily("all");
    setMinReference("");
    setMaxReference("");
    setSort("description");
  };

  const addSavedItemsToRequest = () => {
    const validSelection = savedSelection.filter((item) => Number(item.quantity) > 0);
    if (!validSelection.length) return toast.error("Save at least one catalog item with a quantity greater than zero.");
    sessionStorage.setItem("procurewise.catalogSelectionNotice", String(validSelection.length));
    sessionStorage.setItem("procurewise.catalogSelection", JSON.stringify(validSelection.map((item) => ({ id: item.id, quantity: item.quantity }))));
    toast.success(`${validSelection.length} saved catalog item${validSelection.length === 1 ? "" : "s"} added to a new Purchase Request.`);
    saveCart.mutate({ items: validSelection.map((item) => ({ catalogItemId: item.id, quantity: Number(item.quantity) })) }, { onSuccess: () => setLocation("/purchase-requests?create=1") });
  };

  const resetCreateForm = () => {
    setItemName("");
    setTechnicalSpecs("");
    setUnitOfMeasure("Piece");
    setCustomUnit("");
    setUnitPrice("");
    setDesignatedSupplierId("");
    setCustomProductCode("");
    setItemRemarks("");
    setFormErrors({});
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!itemName.trim() || itemName.trim().length < 2) {
      errors.itemName = "Item name must be at least 2 characters.";
    }
    if (!technicalSpecs.trim() || technicalSpecs.trim().length < 5) {
      errors.technicalSpecs = "Complete technical specifications are required (minimum 5 characters).";
    }
    const resolvedUnit = unitOfMeasure === "Other" ? customUnit.trim() : unitOfMeasure.trim();
    if (!resolvedUnit) {
      errors.unitOfMeasure = "Unit of measurement is required.";
    }
    const parsedPrice = parseFloat(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.unitPrice = "Enter a valid positive unit price.";
    }
    const parsedSupplierId = parseInt(designatedSupplierId, 10);
    if (isNaN(parsedSupplierId) || parsedSupplierId <= 0) {
      errors.supplierId = "A designated supplier must be selected.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in all required item metadata fields.");
      return;
    }

    setFormErrors({});
    createItemMutation.mutate({
      description: itemName.trim(),
      technicalSpecifications: technicalSpecs.trim(),
      unit: resolvedUnit,
      referencePrice: parsedPrice,
      supplierId: parsedSupplierId,
      productCode: customProductCode.trim() || undefined,
      remarks: itemRemarks.trim() || undefined,
    });
  };

  const activeSuppliers = useMemo(() => setup.data?.suppliers ?? [], [setup.data?.suppliers]);

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow={isOfficerOrStaff ? "Item Master Management" : "Reference catalog"}
        title="Procurement catalog"
        description={
          isOfficerOrStaff
            ? "Manage the institutional Item Catalog. Procurement Officers and Staff are authorized solely to create and submit new items with complete metadata (technical specifications, unit price, and designated supplier)."
            : "Save one or more active catalog items, review quantities, and add the selection to one new Purchase Request. Reference amounts support filtering only; prices are not displayed."
        }
        action={
          isOfficerOrStaff
            ? {
                label: "+ Create Catalog Item",
                onClick: () => {
                  resetCreateForm();
                  setIsCreateOpen(true);
                },
              }
            : {
                label: "Open Purchase Requests",
                onClick: () => setLocation("/purchase-requests"),
              }
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left Sidebar */}
        <aside aria-label="Catalog search, filters, and controls" className="h-fit border border-[#e4e1da] bg-white p-4 shadow-sm lg:sticky lg:top-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#7b1e1e]" />
            <p className="text-xs font-bold text-[#34404e]">Find catalog items</p>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-[#77818d]">Search by item name or product code.</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDebouncedSearch(search);
            }}
            className="relative mt-4 block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa1aa]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type a name or code"
              className="h-9 rounded-[4px] pl-9 pr-8 text-xs"
              aria-label="Search catalog items by name or code"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9aa1aa] hover:text-[#34404e]"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </form>

          <div className="mt-4 grid gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">Category</p>
              <Select value={codeFamily} onValueChange={setCodeFamily}>
                <SelectTrigger className="h-9 rounded-[4px] text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(families.data ?? []).map((family) => (
                    <SelectItem key={family.codeFamily} value={family.codeFamily}>
                      {family.label} · {family.itemCount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">
                {isOfficerOrStaff ? "Unit Price Range (₱)" : "Hidden amount range"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={minReference}
                  onChange={(event) => setMinReference(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  aria-label="Minimum reference price"
                  className="h-9 rounded-[4px] text-xs"
                />
                <Input
                  value={maxReference}
                  onChange={(event) => setMaxReference(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  aria-label="Maximum reference price"
                  className="h-9 rounded-[4px] text-xs"
                />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">Sort by</p>
              <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                <SelectTrigger className="h-9 rounded-[4px] text-xs">
                  <SelectValue placeholder="Sort items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="code">Product code</SelectItem>
                  <SelectItem value="reference_low">{isOfficerOrStaff ? "Lowest Unit Price" : "Lowest hidden amount"}</SelectItem>
                  <SelectItem value="reference_high">{isOfficerOrStaff ? "Highest Unit Price" : "Highest hidden amount"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="button" variant="ghost" onClick={clearFilters} className="mt-3 h-7 rounded-[4px] px-0 text-[10px] text-[#7b1e1e]">
            Clear filters
          </Button>

          {/* Conditional Role Panel: PO & Staff vs End-User */}
          {isOfficerOrStaff ? (
            <div className="mt-5 border-t border-[#efebe4] pt-4">
              <div className="rounded-md border border-[#e4d4ae] bg-[#fffaf0] p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9a6d19]">
                  <PackagePlus className="h-3.5 w-3.5 text-[#9a6d19]" />
                  <span>Item Master Authority</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#75643e]">
                  As <strong>{normalizedRole === "procurement_staff" ? "Procurement Staff" : "Procurement Officer"}</strong>, your permissions are dedicated to expanding the item catalog with complete metadata. Requisition cart actions are reserved for End-Users.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateOpen(true);
                  }}
                  className="mt-3.5 h-8 w-full rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  <span>Create New Item</span>
                </Button>
              </div>
            </div>
          ) : (
            /* End-User PR Requisition Cart */
            <div className="mt-5 border-t border-[#efebe4] pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Saved selection
                </p>
                <span className="text-[10px] text-[#77818d]">
                  {savedSelection.length} item{savedSelection.length === 1 ? "" : "s"}
                </span>
              </div>
              {savedSelection.length ? (
                <div className="mt-3 space-y-2">
                  {savedSelection.map((item) => (
                    <div key={item.id} className="border border-[#efebe4] bg-[#fcfaf4] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-semibold leading-4 text-[#34404e]">{item.description}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSavedSelection((current) => current.filter((saved) => saved.id !== item.id))}
                          className="h-6 w-6 shrink-0 rounded-[3px] text-[#9c2525]"
                          aria-label={`Remove ${item.description}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-[10px] text-[#77818d]">Qty.</label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => updateQuantity(item.id, event.target.value)}
                          className="h-7 w-20 rounded-[3px] text-xs"
                          aria-label={`Quantity for ${item.description}`}
                        />
                        <span className="text-[10px] text-[#77818d]">{item.unit || "unit"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] leading-4 text-[#77818d]">
                  Select catalog items to review them here before creating a Purchase Request.
                </p>
              )}
              <div className="mt-3 grid gap-1.5">
                <Button
                  type="button"
                  onClick={addSavedItemsToRequest}
                  disabled={!savedSelection.length}
                  className="h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]"
                >
                  Add saved items to new PR
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearAll}
                  disabled={!savedSelection.length}
                  className="h-7 w-full rounded-[4px] text-[10px] text-[#7b1e1e]"
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Catalog Grid */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#77818d]">
            <span>
              {filteredItems.length} matching item(s) of {catalog.data?.total ?? 0} active catalog item(s)
            </span>
            <span>
              {isOfficerOrStaff
                ? "Official unit prices & designated suppliers are visible for management."
                : "Prices remain hidden from catalog cards."}
            </span>
          </div>

          {catalog.isLoading ? (
            <div className="grid min-h-48 place-items-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e]" />
            </div>
          ) : filteredItems.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const isFavorite = favoriteIds.has(item.id);
                const isSelected = selectedIds.has(item.id);

                return (
                  <article
                    key={item.id}
                    className={`flex flex-col justify-between border bg-white p-4 shadow-sm transition-all ${
                      isSelected ? "border-[#7b1e1e] ring-1 ring-[#d6b16a]" : "border-[#e4e1da]"
                    }`}
                  >
                    <div>
                      {/* Top Action Row */}
                      <div className="flex items-start justify-between gap-3">
                        {isEndUser ? (
                          <label className="flex items-center gap-2 text-[10px] font-semibold text-[#7b1e1e] cursor-pointer">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleSelection(item, checked === true)}
                              aria-label={`Select ${item.description}`}
                            />
                            Select
                          </label>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[#f4f2ee] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#636e7b]">
                            Catalog Item
                          </span>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={isFavorite ? `Remove ${item.description} from favorites` : `Add ${item.description} to favorites`}
                          onClick={() => setFavorite.mutate({ catalogItemId: item.id, isFavorite: !isFavorite })}
                          className="h-8 w-8 rounded-[4px] text-[#7b1e1e] hover:bg-[#fffaf0]"
                        >
                          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>

                      {/* Product Code & Description */}
                      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">
                        {item.productCode}
                      </p>
                      <h2 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-[#303946]">
                        {item.description}
                      </h2>

                      {/* Unit */}
                      <div className="mt-3 border-t border-[#efebe4] pt-2.5 text-[11px] flex items-center justify-between">
                        <span className="text-[#8a929c]">Unit</span>
                        <span className="font-semibold text-[#4b5663]">{item.unit || "—"}</span>
                      </div>

                      {/* Unit Price (Visible for PO & Staff) */}
                      {isOfficerOrStaff && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-[#8a929c] font-medium">Unit Price</span>
                          <span className="font-bold text-[#7b1e1e]">
                            ₱{Number(item.referencePrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Designated Supplier / Source */}
                      {item.source && (
                        <div className="mt-2.5 flex items-center gap-1.5 rounded bg-[#fbf6ea] border border-[#ecdcb8] px-2 py-1 text-[10px] text-[#75643e]">
                          <Truck className="h-3 w-3 shrink-0 text-[#9a6d19]" />
                          <span className="truncate font-medium">{item.source}</span>
                        </div>
                      )}

                      {/* Technical Specs & Remarks */}
                      {item.remarks && (
                        <p className="mt-2.5 whitespace-pre-line text-[11px] leading-relaxed text-[#687381] line-clamp-3">
                          {item.remarks}
                        </p>
                      )}
                    </div>

                    <p className="mt-3 border-t border-[#f2ede6] pt-2 text-[10px] text-[#a1a7ae]">
                      Source as of {item.sourceAsOfDate}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 border border-dashed border-[#d8c88c] bg-[#fffaf0] p-10 text-center">
              <PackageSearch className="mx-auto h-7 w-7 text-[#9a6d19]" />
              <p className="mt-3 text-sm font-semibold text-[#4d3711]">No catalog items match these filters.</p>
              <p className="mt-1 text-[11px] text-[#806b38]">Clear the search or adjust the category and amount ranges.</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Create Catalog Item Modal (Restricted to PO and Staff) ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl p-6 bg-white dark:bg-[#1a222d] border border-[#d8d3ca] dark:border-[#38434f]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#1f2937] dark:text-[#f3f4f6]">
              <PackagePlus className="h-5 w-5 text-[#7b1e1e] dark:text-[#eb766a]" />
              <span>Create New Catalog Item</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
              Register an official item into the procurement catalog with complete required metadata: technical specifications, unit price, and designated supplier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            {/* 1. Item Name */}
            <div>
              <Label htmlFor="catalog-item-name" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                Item Name / Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="catalog-item-name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., BINDING RING/COMB, plastic, 32mm"
                className={`mt-1 h-9 text-xs ${formErrors.itemName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {formErrors.itemName && <p className="mt-1 text-[11px] text-red-600">{formErrors.itemName}</p>}
            </div>

            {/* 2. Technical Specifications */}
            <div>
              <Label htmlFor="catalog-specs" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                Technical Specifications <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="catalog-specs"
                rows={3}
                value={technicalSpecs}
                onChange={(e) => setTechnicalSpecs(e.target.value)}
                placeholder="Specify dimensions, material composition, packaging count, standard compliance, etc..."
                className={`mt-1 text-xs resize-y ${formErrors.technicalSpecs ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {formErrors.technicalSpecs && <p className="mt-1 text-[11px] text-red-600">{formErrors.technicalSpecs}</p>}
            </div>

            {/* 3. Unit of Measure & Unit Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="catalog-unit" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                  Unit of Measurement <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1 flex gap-2">
                  <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {unitOfMeasure === "Other" && (
                    <Input
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="e.g. Set"
                      className="h-9 w-24 text-xs"
                    />
                  )}
                </div>
                {formErrors.unitOfMeasure && <p className="mt-1 text-[11px] text-red-600">{formErrors.unitOfMeasure}</p>}
              </div>

              <div>
                <Label htmlFor="catalog-price" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                  Reference Unit Price (₱) <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6b7280]">
                    ₱
                  </span>
                  <Input
                    id="catalog-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className={`h-9 pl-7 text-xs ${formErrors.unitPrice ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                {formErrors.unitPrice && <p className="mt-1 text-[11px] text-red-600">{formErrors.unitPrice}</p>}
              </div>
            </div>

            {/* 4. Designated Supplier */}
            <div>
              <Label htmlFor="catalog-supplier" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                Designated Supplier <span className="text-red-500">*</span>
              </Label>
              <Select value={designatedSupplierId} onValueChange={setDesignatedSupplierId}>
                <SelectTrigger id="catalog-supplier" className={`mt-1 h-9 text-xs ${formErrors.supplierId ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select designated supplier from registry" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.supplierCode} — {s.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.supplierId && <p className="mt-1 text-[11px] text-red-600">{formErrors.supplierId}</p>}
            </div>

            {/* 5. Product Code & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="catalog-code" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                  Product Code <span className="text-[10px] font-normal text-[#6b7280]">(Optional)</span>
                </Label>
                <Input
                  id="catalog-code"
                  value={customProductCode}
                  onChange={(e) => setCustomProductCode(e.target.value)}
                  placeholder={`Auto: CAT-${new Date().getFullYear()}-XXXXXX`}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="catalog-remarks" className="text-xs font-semibold text-[#374151] dark:text-[#e5e7eb]">
                  Additional Remarks <span className="text-[10px] font-normal text-[#6b7280]">(Optional)</span>
                </Label>
                <Input
                  id="catalog-remarks"
                  value={itemRemarks}
                  onChange={(e) => setItemRemarks(e.target.value)}
                  placeholder="e.g. Standard lead time 5 days"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Complete Metadata Validation Notice */}
            <div className="flex items-start gap-2 rounded border border-[#ecdcb8] bg-[#fffaf0] p-2.5 text-[11px] text-[#75643e]">
              <Info className="h-4 w-4 shrink-0 text-[#9a6d19] mt-0.5" />
              <span>
                Under procurement rules, submitting a catalog item requires complete metadata: verified item name, technical specifications, unit of issue, unit reference price, and designated accredited supplier.
              </span>
            </div>

            <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createItemMutation.isPending}
                className="h-9 rounded-[4px] border-[#d8d3ca] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createItemMutation.isPending}
                className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
              >
                {createItemMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Submit Catalog Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
