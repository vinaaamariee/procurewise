import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Heart, LoaderCircle, PackageSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const money = (value: string | number) => `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

type SortOption = "description" | "code" | "reference_low" | "reference_high";

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [codeFamily, setCodeFamily] = useState("all");
  const [minReference, setMinReference] = useState("");
  const [maxReference, setMaxReference] = useState("");
  const [sort, setSort] = useState<SortOption>("description");
  const queryInput = useMemo(() => ({ search: search.trim() || undefined, codeFamily: codeFamily === "all" ? undefined : codeFamily, page: 1, limit: 100 }), [search, codeFamily]);
  const catalog = trpc.procurement.catalog.list.useQuery(queryInput, { retry: false });
  const families = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const setFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => void utils.procurement.catalog.favorites.invalidate(), onError: (error) => toast.error(error.message) });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.id)), [favorites.data]);
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
  const clearFilters = () => { setSearch(""); setCodeFamily("all"); setMinReference(""); setMaxReference(""); setSort("description"); };

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Reference catalog" title="Procurement catalog" description="Browse active catalog items and select one directly into a new Purchase Request. Reference amounts are used for filtering only and are not displayed in the catalog cards." action={{ label: "Open Purchase Requests", onClick: () => { window.location.href = "/purchase-requests"; } }} />
    <div className="mt-7 border border-[#e4e1da] bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_180px_180px_190px]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1aa]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item or product code" className="h-9 rounded-[4px] pl-9 text-xs" aria-label="Search catalog" /></label>
        <Select value={codeFamily} onValueChange={setCodeFamily}><SelectTrigger className="h-9 rounded-[4px] text-xs"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{(families.data ?? []).map((family) => <SelectItem key={family.codeFamily} value={family.codeFamily}>{family.label} · {family.itemCount}</SelectItem>)}</SelectContent></Select>
        <Input value={minReference} onChange={(event) => setMinReference(event.target.value)} type="number" min="0" step="0.01" placeholder="Minimum amount" aria-label="Minimum reference amount" className="h-9 rounded-[4px] text-xs" />
        <Input value={maxReference} onChange={(event) => setMaxReference(event.target.value)} type="number" min="0" step="0.01" placeholder="Maximum amount" aria-label="Maximum reference amount" className="h-9 rounded-[4px] text-xs" />
        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}><SelectTrigger className="h-9 rounded-[4px] text-xs"><SelectValue placeholder="Sort items" /></SelectTrigger><SelectContent><SelectItem value="description">Sort: description</SelectItem><SelectItem value="code">Sort: product code</SelectItem><SelectItem value="reference_low">Sort: lowest reference amount</SelectItem><SelectItem value="reference_high">Sort: highest reference amount</SelectItem></SelectContent></Select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] leading-4 text-[#8b929b]">Use amount ranges to narrow results. Exact reference amounts remain hidden from catalog cards.</p><Button type="button" variant="ghost" onClick={clearFilters} className="h-7 rounded-[4px] px-2 text-[10px] text-[#7b1e1e]">Clear filters</Button></div>
    </div>
    <div className="mt-4 flex items-center justify-between text-[11px] text-[#77818d]"><span>{filteredItems.length} matching item(s) of {catalog.data?.total ?? 0} active catalog item(s)</span><span>Favorites are personal to your signed-in account.</span></div>
    {catalog.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e]" /></div> : filteredItems.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredItems.map((item) => { const isFavorite = favoriteIds.has(item.id); return <article key={item.id} className="border border-[#e4e1da] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[#f8f1e0] text-[#7b1e1e]"><PackageSearch className="h-4 w-4" /></div><Button type="button" variant="ghost" size="icon" aria-label={isFavorite ? `Remove ${item.description} from favorites` : `Add ${item.description} to favorites`} onClick={() => setFavorite.mutate({ catalogItemId: item.id, isFavorite: !isFavorite })} className="h-8 w-8 rounded-[4px] text-[#7b1e1e] hover:bg-[#fffaf0]"><Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} /></Button></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">{item.productCode}</p><h2 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-[#303946]">{item.description}</h2><div className="mt-4 border-t border-[#efebe4] pt-3 text-[11px]"><p className="text-[#8a929c]">Unit</p><p className="mt-1 font-semibold text-[#4b5663]">{item.unit || "—"}</p></div>{item.remarks && <p className="mt-3 text-[11px] leading-5 text-[#77818d]">{item.remarks}</p>}<p className="mt-3 text-[10px] text-[#a1a7ae]">Source as of {item.sourceAsOfDate}</p><Button asChild className="mt-4 h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]"><Link href={`/purchase-requests?create=1&catalogItemId=${item.id}`}>Use in new Purchase Request</Link></Button></article>; })}</div> : <div className="mt-4 border border-dashed border-[#d8c88c] bg-[#fffaf0] p-10 text-center"><PackageSearch className="mx-auto h-7 w-7 text-[#9a6d19]" /><p className="mt-3 text-sm font-semibold text-[#4d3711]">No catalog items match these filters.</p><p className="mt-1 text-[11px] text-[#806b38]">Clear the search or adjust the category and amount ranges.</p></div>}
  </div>;
}
