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

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [codeFamily, setCodeFamily] = useState("all");
  const queryInput = useMemo(() => ({ search: search.trim() || undefined, codeFamily: codeFamily === "all" ? undefined : codeFamily, page: 1, limit: 100 }), [search, codeFamily]);
  const catalog = trpc.procurement.catalog.list.useQuery(queryInput, { retry: false });
  const families = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const setFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => void utils.procurement.catalog.favorites.invalidate(), onError: (error) => toast.error(error.message) });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.id)), [favorites.data]);

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Reference catalog" title="Procurement catalog" description="Browse active catalog items and reference prices before adding an item to a Purchase Request or PPMP record." action={{ label: "Open Purchase Requests", onClick: () => { window.location.href = "/purchase-requests"; } }} />
    <div className="mt-7 flex flex-wrap items-center gap-3 border border-[#e4e1da] bg-white p-4 shadow-sm">
      <label className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1aa]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item description or product code" className="h-9 rounded-[4px] pl-9 text-xs" aria-label="Search catalog" /></label>
      <Select value={codeFamily} onValueChange={setCodeFamily}><SelectTrigger className="h-9 w-full rounded-[4px] text-xs sm:w-[220px]"><SelectValue placeholder="All code families" /></SelectTrigger><SelectContent><SelectItem value="all">All code families</SelectItem>{(families.data ?? []).map((family) => <SelectItem key={family.codeFamily} value={family.codeFamily}>{family.label} · {family.itemCount}</SelectItem>)}</SelectContent></Select>
      <Button asChild variant="outline" className="h-9 rounded-[4px] text-xs"><Link href="/purchase-requests">Add through Purchase Request</Link></Button>
    </div>
    <div className="mt-4 flex items-center justify-between text-[11px] text-[#77818d]"><span>{catalog.data?.total ?? 0} active catalog item(s)</span><span>Favorites are personal to your signed-in account.</span></div>
    {catalog.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e]" /></div> : catalog.data?.items.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{catalog.data.items.map((item) => { const isFavorite = favoriteIds.has(item.id); return <article key={item.id} className="border border-[#e4e1da] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[#f8f1e0] text-[#7b1e1e]"><PackageSearch className="h-4 w-4" /></div><Button type="button" variant="ghost" size="icon" aria-label={isFavorite ? `Remove ${item.description} from favorites` : `Add ${item.description} to favorites`} onClick={() => setFavorite.mutate({ catalogItemId: item.id, isFavorite: !isFavorite })} className="h-8 w-8 rounded-[4px] text-[#7b1e1e] hover:bg-[#fffaf0]"><Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} /></Button></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">{item.productCode}</p><h2 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-[#303946]">{item.description}</h2><div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#efebe4] pt-3 text-[11px]"><div><p className="text-[#8a929c]">Unit</p><p className="mt-1 font-semibold text-[#4b5663]">{item.unit || "—"}</p></div><div><p className="text-[#8a929c]">Reference price</p><p className="mt-1 font-semibold text-[#7b1e1e]">{money(item.referencePrice)}</p></div></div>{item.remarks && <p className="mt-3 text-[11px] leading-5 text-[#77818d]">{item.remarks}</p>}<p className="mt-3 text-[10px] text-[#a1a7ae]">Source as of {item.sourceAsOfDate}</p></article>; })}</div> : <div className="mt-4 border border-dashed border-[#d8c88c] bg-[#fffaf0] p-10 text-center"><PackageSearch className="mx-auto h-7 w-7 text-[#9a6d19]" /><p className="mt-3 text-sm font-semibold text-[#4d3711]">No catalog items match this search.</p><p className="mt-1 text-[11px] text-[#806b38]">Clear the search or select another code family.</p></div>}
  </div>;
}
