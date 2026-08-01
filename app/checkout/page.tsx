import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Footer } from "@/components/Footer";

export default function CheckoutPage() {
  return <main className="checkout-page"><AppHeader />
    <section className="checkout-hero"><span>SECURE CHECKOUT</span><h1>အော်ဒါအချက်အလက် ဖြည့်ပါ</h1><p>ငွေမလွှဲမီ Product၊ ပမာဏနှင့် payment account ကို နောက်တစ်ကြိမ် စစ်ဆေးပါ။</p></section>
    <Suspense fallback={<div className="checkout-loading">Checkout ရယူနေသည်…</div>}><CheckoutForm /></Suspense>
    <Footer />
  </main>;
}
