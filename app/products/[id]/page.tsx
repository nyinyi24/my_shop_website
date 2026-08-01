import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { type ApiProduct, toCatalogProduct } from "@/lib/api-catalog";

async function getProduct(id: string) {
  if (!/^\d+$/.test(id)) notFound();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
  const response = await fetch(`${apiUrl}/api/v1/products/${id}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Product API returned ${response.status}`);
  const payload = await response.json() as ApiProduct;
  return { product: toCatalogProduct(payload), related: (payload.related_products || []).map(toCatalogProduct) };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { product, related } = await getProduct(id);
  const stockClass = product.stock === 0 ? "out" : product.stock <= 2 ? "low" : "in";

  return <main className="product-detail-page"><AppHeader />
    <section className="product-detail-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">ပင်မ</Link><span>›</span><Link href="/products">Products</Link><span>›</span><b>{product.name}</b></nav>
      <div className="product-detail-grid">
        <div className="product-visual"><span className={`product-logo ${product.accent}`}>{product.icon}</span><small>{product.categoryLabel}</small><div className="visual-watermark">ENI</div></div>
        <div className="product-detail-info"><span className="detail-category">{product.categoryLabel}</span><h1>{product.name}</h1><p>{product.description}</p><div className="detail-price"><small>လက်ရှိဈေးနှုန်း</small><b>{product.price}</b></div><div className="detail-facts"><div><span>Stock</span><b className={`stock ${stockClass}`}><i />{product.stock > 0 ? `${product.stock} ခု ရရှိနိုင်သည်` : "လက်ရှိမရှိပါ"}</b></div><div><span>Delivery</span><b>{product.delivery}</b></div><div><span>Warranty</span><b>{product.warranty}</b></div></div><div className="detail-note"><b>မဝယ်ယူမီ သိထားရန်</b><p>{product.purchaseNote || "Digital product ဖြစ်သောကြောင့် delivery မပို့မီ Product အမျိုးအစား၊ အသုံးပြုမည့် account နှင့် အာမခံစည်းကမ်းကို သေချာစစ်ဆေးပါ။"}</p></div>{product.stock > 0 ? <Link href={`/checkout?product=${product.id}`} className="gold-btn detail-buy">ဝယ်ယူရန် ဆက်သွားမည် <span>→</span></Link> : <button className="gold-btn detail-buy" disabled>Stock ပြန်ရောက်ရန် စောင့်ဆိုင်းနေသည်</button>}<a className="detail-support" href="https://t.me/independence_N" target="_blank" rel="noreferrer">မရှင်းလင်းတာရှိပါသလား? @independence_N ကို မေးရန် ↗</a></div>
      </div>
    </section>
    {related.length > 0 && <section className="home-section related-products"><div className="home-section-head"><div><span>ဆက်စပ် Products</span><h2>အမျိုးအစားတူ ရွေးချယ်စရာများ</h2></div><Link href={`/products?category=${product.category}`}>အားလုံးကြည့်ရန် →</Link></div><div className="product-grid">{related.map(item => <ProductCard product={item} key={item.id}/>)}</div></section>}
    <Footer />
  </main>;
}
