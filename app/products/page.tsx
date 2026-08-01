import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { ProductsCatalog } from "@/components/ProductsCatalog";

export default function ProductsPage() {
  return <main className="products-page">
    <AppHeader />
    <section className="catalog-hero"><span>ENI PRODUCT CATALOG</span><h1>Digital Products & Services</h1><p>ဈေးနှုန်း၊ stock၊ delivery နှင့် အာမခံအခြေအနေကို နှိုင်းယှဉ်ပြီးမှ ရွေးချယ်ပါ။</p></section>
    <Suspense fallback={<div className="catalog-loading">Products များ ရယူနေသည်…</div>}><ProductsCatalog /></Suspense>
    <Footer />
  </main>;
}
