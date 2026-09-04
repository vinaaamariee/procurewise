import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Heart, LoaderCircle, PackageSearch, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type SortOption = "description" | "code" | "reference_low" | "reference_high";
type SavedSelection = { id: number; productCode: string; description: string; unit: string; quantity: string; referencePrice: string };

export default function CatalogPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [codeFamily, setCodeFamily] = useState("all");
  const [minReference, setMinReference] = useState("");
  const [maxReference, setMaxReference] = useState("");
  const [sort, setSort] = useState<SortOption>("description");
  const [savedSelection, setSavedSelection] = useState<SavedSelection[]>([]);
  const queryInput = useMemo(() => ({ search: search.trim() || undefined, codeFamily: codeFamily === "all" ? undefined : codeFamily, page: 1, limit: 100 }), [search, codeFamily]);
  const catalog = trpc.procurement.catalog.list.useQuery(queryInput, { retry: false });
  const families = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const savedItems = trpc.procurement.catalog.saved.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const saveCart = trpc.procurement.catalog.save.useMutation({ onError: (error) => toast.error(`Saved selection could not be synchronized: ${error.message}`) });
  const clearSavedCart = trpc.procurement.catalog.clearSaved.useMutation({ onError: (error) => toast.error(`Saved selection could not be cleared: ${error.message}`) });
  const setFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => void utils.procurement.catalog.favorites.invalidate(), onError: (error) => toast.error(error.message) });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.id)), [favorites.data]);
  useEffect(() => {
    if (!savedItems.isSuccess) return;
    setSavedSelection((savedItems.data ?? []).map((item) => ({ id: item.catalogItemId, productCode: item.productCode, description: item.description, unit: item.unit || "", quantity: String(item.quantity), referencePrice: String(item.referencePrice) })));
  }, [savedItems.data, savedItems.isSuccess]);
  const filteredItems = useMemo(() => {
    const min = minReference === "" ? 0 : Number(minReference);
    const max = maxReference === "" ? Number.POSITIVE_INFINITY : Number(maxReference);
    return [...(catalog.data?.items ?? [])].filter((item) => Number(item.referencePrice) >= min && Number(item.referencePrice) <= max).sort((left, right) => {
      if (sort === "code") return left.productCode.localeCompare(right.productCode, undefined, { numeric: true });
      if (sort === "reference_low") return Number(left.referencePrice) - Number(right.referencePrice);
      if (sort === "reference_high") return Number(right.referencePrice) - Number(left.referencePrice);
      return left.description.localeCompare(right.description);
    });
  }, [catalog.data?.items, minReference, maxReference, sort]);
  const selectedIds = useMemo(() => new Set(savedSelection.map((item) => item.id)), [savedSelection]);
  const persistSavedSelection = (next: SavedSelection[]) => { setSavedSelection(next); saveCart.mutate({ items: next.map((item) => ({ catalogItemId: item.id, quantity: Number(item.quantity) || 1 })) }); };
  const toggleSelection = (item: { id: number; productCode: string; description: string; unit: string | null; referencePrice: string }, checked: boolean) => setSavedSelection((current) => { const next = checked ? current.some((saved) => saved.id === item.id) ? current : [...current, { id: item.id, productCode: item.productCode, description: item.description, unit: item.unit || "", quantity: "1", referencePrice: item.referencePrice }] : current.filter((saved) => saved.id !== item.id); persistSavedSelection(next); return next; });
  const updateQuantity = (id: number, quantity: string) => setSavedSelection((current) => { const next = current.map((item) => item.id === id ? { ...item, quantity } : item); persistSavedSelection(next); return next; });
  const clearAll = () => { setSavedSelection([]); clearSavedCart.mutate(); toast.success("Saved catalog selection cleared."); };
  const clearFilters = () => { setSearch(""); setCodeFamily("all"); setMinReference(""); setMaxReference(""); setSort("description"); };
  const addSavedItemsToRequest = () => {
    const validSelection = savedSelection.filter((item) => Number(item.quantity) > 0);
    if (!validSelection.length) return toast.error("Save at least one catalog item with a quantity greater than zero.");
    sessionStorage.setItem("procurewise.catalogSelectionNotice", String(validSelection.length));
    sessionStorage.setItem("procurewise.catalogSelection", JSON.stringify(validSelection.map((item) => ({ id: item.id, quantity: item.quantity }))));
    toast.success(`${validSelection.length} saved catalog item${validSelection.length === 1 ? "" : "s"} added to a new Purchase Request.`);
    saveCart.mutate({ items: validSelection.map((item) => ({ catalogItemId: item.id, quantity: Number(item.quantity) })) }, { onSuccess: () => setLocation("/purchase-requests?create=1") });
  };

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Reference catalog" title="Procurement catalog" description="Save one or more active catalog items, review quantities, and add the selection to one new Purchase Request. Reference amounts support filtering only; prices are not displayed." action={{ label: "Open Purchase Requests", onClick: () => setLocation("/purchase-requests") }} />
    <div className="mt-7 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside aria-label="Catalog search, filters, and saved selection" className="h-fit border border-[#e4e1da] bg-white p-4 shadow-sm lg:sticky lg:top-5">
        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#7b1e1e]" /><p className="text-xs font-bold text-[#34404e]">Find catalog items</p></div>
        <p className="mt-1.5 text-[10px] leading-4 text-[#77818d]">Search by item name or product code.</p>
        <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa1aa]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a name or code" className="h-9 rounded-[4px] pl-9 text-xs" aria-label="Search catalog items by name or code" /></label>
        <div className="mt-4 grid gap-3"><div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">Category</p><Select value={codeFamily} onValueChange={setCodeFamily}><SelectTrigger className="h-9 rounded-[4px] text-xs"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{(families.data ?? []).map((family) => <SelectItem key={family.codeFamily} value={family.codeFamily}>{family.label} · {family.itemCount}</SelectItem>)}</SelectContent></Select></div><div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">Hidden amount range</p><div className="grid grid-cols-2 gap-2"><Input value={minReference} onChange={(event) => setMinReference(event.target.value)} type="number" min="0" step="0.01" placeholder="Min" aria-label="Minimum hidden reference amount" className="h-9 rounded-[4px] text-xs" /><Input value={maxReference} onChange={(event) => setMaxReference(event.target.value)} type="number" min="0" step="0.01" placeholder="Max" aria-label="Maximum hidden reference amount" className="h-9 rounded-[4px] text-xs" /></div></div><div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]">Sort by</p><Select value={sort} onValueChange={(value) => setSort(value as SortOption)}><SelectTrigger className="h-9 rounded-[4px] text-xs"><SelectValue placeholder="Sort items" /></SelectTrigger><SelectContent><SelectItem value="description">Description</SelectItem><SelectItem value="code">Product code</SelectItem><SelectItem value="reference_low">Lowest hidden amount</SelectItem><SelectItem value="reference_high">Highest hidden amount</SelectItem></SelectContent></Select></div></div>
        <Button type="button" variant="ghost" onClick={clearFilters} className="mt-3 h-7 rounded-[4px] px-0 text-[10px] text-[#7b1e1e]">Clear filters</Button>
        <div className="mt-5 border-t border-[#efebe4] pt-4"><div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a6d19]"><ShoppingCart className="h-3.5 w-3.5" />Saved selection</p><span className="text-[10px] text-[#77818d]">{savedSelection.length} item{savedSelection.length === 1 ? "" : "s"}</span></div>{savedSelection.length ? <div className="mt-3 space-y-2">{savedSelection.map((item) => <div key={item.id} className="border border-[#efebe4] bg-[#fcfaf4] p-2.5"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-semibold leading-4 text-[#34404e]">{item.description}</p><Button type="button" variant="ghost" size="icon" onClick={() => setSavedSelection((current) => current.filter((saved) => saved.id !== item.id))} className="h-6 w-6 shrink-0 rounded-[3px] text-[#9c2525]" aria-label={`Remove ${item.description}`}><Trash2 className="h-3 w-3" /></Button></div><div className="mt-2 flex items-center gap-2"><label className="text-[10px] text-[#77818d]">Qty.</label><Input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateQuantity(item.id, event.target.value)} className="h-7 w-20 rounded-[3px] text-xs" aria-label={`Quantity for ${item.description}`} /><span className="text-[10px] text-[#77818d]">{item.unit || "unit"}</span></div></div>)}</div> : <p className="mt-2 text-[10px] leading-4 text-[#77818d]">Select catalog items to review them here before creating a Purchase Request.</p>}<div className="mt-3 grid gap-1.5"><Button type="button" onClick={addSavedItemsToRequest} disabled={!savedSelection.length} className="h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">Add saved items to new PR</Button><Button type="button" variant="ghost" onClick={clearAll} disabled={!savedSelection.length} className="h-7 w-full rounded-[4px] text-[10px] text-[#7b1e1e]">Clear all</Button></div></div>
      </aside>
      <section className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#77818d]"><span>{filteredItems.length} matching item(s) of {catalog.data?.total ?? 0} active catalog item(s)</span><span>Prices remain hidden from catalog cards.</span></div>{catalog.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-5 w-5 text-[#7b1e1e]" /></div> : filteredItems.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredItems.map((item) => { const isFavorite = favoriteIds.has(item.id); const isSelected = selectedIds.has(item.id); return <article key={item.id} className={`border bg-white p-4 shadow-sm ${isSelected ? "border-[#7b1e1e] ring-1 ring-[#d6b16a]" : "border-[#e4e1da]"}`}><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-[10px] font-semibold text-[#7b1e1e]"><Checkbox checked={isSelected} onCheckedChange={(checked) => toggleSelection(item, checked === true)} aria-label={`Select ${item.description}`} />Select</label><Button type="button" variant="ghost" size="icon" aria-label={isFavorite ? `Remove ${item.description} from favorites` : `Add ${item.description} to favorites`} onClick={() => setFavorite.mutate({ catalogItemId: item.id, isFavorite: !isFavorite })} className="h-8 w-8 rounded-[4px] text-[#7b1e1e] hover:bg-[#fffaf0]"><Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} /></Button></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">{item.productCode}</p><h2 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-[#303946]">{item.description}</h2><div className="mt-4 border-t border-[#efebe4] pt-3 text-[11px]"><p className="text-[#8a929c]">Unit</p><p className="mt-1 font-semibold text-[#4b5663]">{item.unit || "—"}</p></div>{item.remarks && <p className="mt-3 text-[11px] leading-5 text-[#77818d]">{item.remarks}</p>}<p className="mt-3 text-[10px] text-[#a1a7ae]">Source as of {item.sourceAsOfDate}</p></article>; })}</div> : <div className="mt-4 border border-dashed border-[#d8c88c] bg-[#fffaf0] p-10 text-center"><PackageSearch className="mx-auto h-7 w-7 text-[#9a6d19]" /><p className="mt-3 text-sm font-semibold text-[#4d3711]">No catalog items match these filters.</p><p className="mt-1 text-[11px] text-[#806b38]">Clear the search or adjust the category and amount ranges.</p></div>}</section>
    </div>
  </div>;
}
