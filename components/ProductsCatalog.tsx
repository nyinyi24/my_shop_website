"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { categories, type Product } from "@/lib/catalog";
import { type ApiProduct, toCatalogProduct } from "@/lib/api-catalog";

type SortKey = "featured" | "price-low" | "price-high" | "stock";
type CatalogPayload = { data: ApiProduct[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null; category_counts?: Record<string, number>; all_products_count?: number };

export function ProductsCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "all";
  const query = searchParams.get("q") || "";
  const availability = searchParams.get("availability") || "all";
  const sort = (searchParams.get("sort") || "featured") as SortKey;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, from: 0, to: 0, allCount: 0, categoryCounts: {} as Record<string, number> });
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingProducts(true); setLoadError("");
      const params = new URLSearchParams({ page: String(page), per_page: "12", sort });
      if (category !== "all") params.set("category", category);
      if (query.trim()) params.set("search", query.trim());
      if (availability === "available") params.set("availability", "available");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${apiUrl}/api/v1/products?${params}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const payload: CatalogPayload = await response.json();
        setProducts(payload.data.map(toCatalogProduct));
        setMeta({ currentPage: payload.current_page, lastPage: payload.last_page, total: payload.total, from: payload.from || 0, to: payload.to || 0, allCount: payload.all_products_count || payload.total, categoryCounts: payload.category_counts || {} });
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setLoadError("Products နှင့် stock အချက်အလက် ရယူ၍မရပါ။");
      } finally { if (!controller.signal.aborted) setLoadingProducts(false); }
    }, query ? 350 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [availability, category, page, query, sort]);

  function updateFilter(name: string, value: string, defaultValue = "all") {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === defaultValue) params.delete(name); else params.set(name, value);
    if (name !== "page") params.delete("page");
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }
  function resetFilters() { router.replace(pathname, { scroll: false }); }
  const hasFilters = category !== "all" || query || availability !== "all" || sort !== "featured";

  return <section className="catalog-shell">
    <aside className="catalog-sidebar">
      <div className="filter-heading"><b>စစ်ထုတ်ရန်</b>{hasFilters && <button onClick={resetFilters}>အားလုံးရှင်းမည်</button>}</div>
      <div className="filter-group"><span>အမျိုးအစား</span><button className={category === "all" ? "active" : ""} onClick={() => updateFilter("category", "all")}>အားလုံး <em>{meta.allCount}</em></button>{categories.map(item => <button className={category === item.id ? "active" : ""} onClick={() => updateFilter("category", item.id)} key={item.id}><i>{item.icon}</i>{item.mm}<em>{meta.categoryCounts[item.id] || 0}</em></button>)}</div>
      <div className="filter-group"><span>ရရှိနိုင်မှု</span><button className={availability === "all" ? "active" : ""} onClick={() => updateFilter("availability", "all")}>Stock အားလုံး</button><button className={availability === "available" ? "active" : ""} onClick={() => updateFilter("availability", "available")}>ဝယ်ယူနိုင်သည်</button></div>
      <div className="catalog-help"><b>ရွေးချယ်ရခက်နေပါသလား?</b><p>မဝယ်ခင် Product စည်းကမ်းကို Support မှာ မေးနိုင်ပါတယ်။</p><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">@independence_N ကိုမေးရန် ↗</a></div>
    </aside>
    <div className={`catalog-content${loadingProducts ? " is-loading" : ""}`}>
      <div className="catalog-toolbar"><label className="catalog-search"><span>⌕</span><input value={query} onChange={event => updateFilter("q", event.target.value, "")} placeholder="Product အမည်၊ category ဖြင့်ရှာရန်…" aria-label="Product ရှာရန်"/>{query && <button onClick={() => updateFilter("q", "", "")} aria-label="ရှာဖွေမှုရှင်းရန်">×</button>}</label><label className="catalog-sort"><span>စီရန်</span><select value={sort} onChange={event => updateFilter("sort", event.target.value, "featured")}><option value="featured">အကြံပြုထားသည်</option><option value="price-low">ဈေးနည်းမှ များ</option><option value="price-high">ဈေးများမှ နည်း</option><option value="stock">Stock များဆုံး</option></select></label></div>
      {loadError ? <div className="catalog-empty"><span>!</span><h2>Products ဖွင့်၍မရပါ</h2><p>{loadError} Backend server ကို စစ်ဆေးပါ။</p></div> : <><div className="catalog-result-head"><div><b>{meta.total}</b> Products တွေ့ရှိသည် {meta.total > 0 && <small>({meta.from}–{meta.to})</small>}</div>{category !== "all" && <span>{categories.find(item => item.id === category)?.mm}<button onClick={() => updateFilter("category", "all")}>×</button></span>}</div>
      {loadingProducts && !products.length ? <div className="catalog-loading">Products နှင့် live stock ရယူနေသည်…</div> : products.length ? <><div className="product-grid catalog-product-grid">{products.map(product => <ProductCard product={product} key={product.id}/>)}</div>{meta.lastPage > 1 && <nav className="catalog-pagination" aria-label="Product pages"><button disabled={meta.currentPage === 1 || loadingProducts} onClick={() => updateFilter("page", String(meta.currentPage - 1), "1")}>← ရှေ့</button><span>Page <b>{meta.currentPage}</b> / {meta.lastPage}</span><button disabled={meta.currentPage === meta.lastPage || loadingProducts} onClick={() => updateFilter("page", String(meta.currentPage + 1), "1")}>နောက် →</button></nav>}</> : <div className="catalog-empty"><span>⌕</span><h2>ကိုက်ညီသော Product မတွေ့ပါ</h2><p>စာလုံးပေါင်း သို့မဟုတ် filter ကို ပြောင်းပြီး ထပ်ရှာကြည့်ပါ။</p><button className="gold-btn compact" onClick={resetFilters}>Filter အားလုံးရှင်းမည်</button></div>}</>}
    </div>
  </section>;
}
