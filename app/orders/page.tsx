"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

type TrackingResult = { order_number: string; status: string; payment_status: string; created_at: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const statusLabels: Record<string,string> = { pending: "စောင့်ဆိုင်းနေသည်", approved: "အတည်ပြုပြီး", rejected: "ပယ်ချထားသည်", processing: "Delivery ပြင်ဆင်နေသည်", completed: "ပြီးမြောက်ပြီ", cancelled: "ပယ်ဖျက်ထားသည်" };

export default function OrdersPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = orderNumber.trim().toUpperCase();
    setResult(null); setError("");
    if (!/^ENI-\d{6}-[A-Z0-9]{4,8}$/.test(normalized)) { setError("Order ID ပုံစံမမှန်ပါ။ ဥပမာ ENI-260717-A1B2C"); return; }
    if (!apiUrl) { setError("Backend API URL မသတ်မှတ်ရသေးပါ။ .env.local ကို စစ်ပါ။"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/orders/track/${encodeURIComponent(normalized)}`, { headers: { Accept: "application/json" } });
      if (response.status === 404) { setError("ဒီ Order ID နဲ့ကိုက်ညီတဲ့ အော်ဒါ မတွေ့ပါ။ စာလုံးနှင့် ဂဏန်းကို ပြန်စစ်ပါ။"); return; }
      if (response.status === 429) { setError("စစ်ဆေးမှုများလွန်းနေပါသည်။ ခဏစောင့်ပြီး ထပ်စမ်းပါ။"); return; }
      if (!response.ok) throw new Error();
      setResult(await response.json()); setOrderNumber(normalized);
    } catch { setError("Order server နှင့် ဆက်သွယ်၍မရပါ။ Network နှင့် backend server ကို စစ်ပါ။"); }
    finally { setLoading(false); }
  }

  return <main className="tracking-page"><AppHeader />
    <section className="tracking-hero"><span>ORDER TRACKING</span><h1>အော်ဒါဘယ်အဆင့်ရောက်နေလဲ<br/>စစ်ဆေးပါ။</h1><p>Order ID တစ်ခုတည်းဖြင့် payment verification နှင့် delivery အခြေအနေကို privacy-safe ပုံစံဖြင့် ကြည့်နိုင်ပါတယ်။</p></section>
    <section className="tracking-shell"><form className="tracking-form" onSubmit={track} noValidate><label><span>Order ID</span><div><input value={orderNumber} onChange={(event) => { setOrderNumber(event.target.value.toUpperCase()); setError(""); }} placeholder="ENI-260717-A1B2C" autoCapitalize="characters" spellCheck={false} aria-describedby="order-hint" /><button className="gold-btn" disabled={loading}>{loading ? <><i />စစ်ဆေးနေသည်…</> : "အခြေအနေစစ်ရန် →"}</button></div><small id="order-hint">အော်ဒါတင်ပြီးရရှိသော `ENI-` ဖြင့်စသည့် ID ကို ထည့်ပါ။</small></label></form>
      {error && <div className="tracking-error" role="alert"><span>!</span><div><b>စစ်ဆေး၍မရပါ</b><p>{error}</p></div></div>}
      {result ? <TrackingDetails order={result} /> : !error && <div className="tracking-help"><article><span>01</span><div><b>Order ID ကိုရှာပါ</b><p>Order confirmation သို့မဟုတ် Dashboard မှာ ရှာနိုင်ပါတယ်။</p></div></article><article><span>02</span><div><b>အခြေအနေစစ်ပါ</b><p>Customer အမည်၊ ဖုန်းနံပါတ်နှင့် payment အချက်အလက်ကို မပြပါ။</p></div></article><article><span>03</span><div><b>မတွေ့ရင် Support ကိုမေးပါ</b><p>Order ID နှင့်အတူ Telegram Support ကို ဆက်သွယ်နိုင်ပါတယ်။</p></div></article></div>}
      <div className="tracking-account-cta"><div><span>▦</span><p><b>အော်ဒါအားလုံး တစ်နေရာတည်းမှာကြည့်ချင်ပါသလား?</b><small>Customer Dashboard မှာ order history အားလုံးကို account ဖြင့် ကြည့်နိုင်ပါတယ်။</small></p></div><Link href="/dashboard" className="ghost-btn">Dashboard သို့သွားရန်</Link></div>
    </section><Footer />
  </main>;
}

function TrackingDetails({ order }: { order: TrackingResult }) {
  const terminal = ["rejected", "cancelled"].includes(order.status) || order.payment_status === "rejected";
  const currentStep = order.status === "completed" ? 4 : order.status === "processing" ? 3 : order.payment_status === "approved" || order.status === "approved" ? 2 : 1;
  const steps = [{ label: "အော်ဒါလက်ခံရရှိ", description: "Order စနစ်ထဲ ရောက်ရှိပြီး" }, { label: "Payment အတည်ပြု", description: "Admin မှ ငွေပေးချေမှုစစ်ဆေးမည်" }, { label: "Delivery ပြင်ဆင်", description: "Digital product ပြင်ဆင်နေသည်" }, { label: "ပြီးမြောက်", description: "Delivery ပို့ပြီး" }];
  return <section className="tracking-result"><header><div><small>ORDER NUMBER</small><h2>{order.order_number}</h2><p>{new Intl.DateTimeFormat("my-MM", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.created_at))}</p></div><span className={`tracking-status ${terminal ? "failed" : order.status}`}>{statusLabels[order.status] || order.status}</span></header>{terminal ? <div className="tracking-terminal"><span>!</span><div><b>{order.status === "cancelled" ? "အော်ဒါပယ်ဖျက်ထားပါသည်" : "Payment သို့မဟုတ် အော်ဒါကို အတည်မပြုနိုင်ပါ"}</b><p>အသေးစိတ်အကြောင်းရင်းနှင့် နောက်တစ်ဆင့်ကိုသိရန် Order ID ဖြင့် Support ကို ဆက်သွယ်ပါ။</p></div><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">@independence_N ↗</a></div> : <div className="tracking-timeline">{steps.map((step, index) => { const number = index + 1; const state = number < currentStep ? "done" : number === currentStep ? "current" : "upcoming"; return <article className={state} key={step.label}><div><i>{state === "done" ? "✓" : number}</i><span /></div><section><b>{step.label}</b><small>{state === "done" ? "ပြီးမြောက်" : state === "current" ? step.description : "မရောက်သေးပါ"}</small></section></article>; })}</div>}<footer><span>Payment: <b>{statusLabels[order.payment_status] || order.payment_status}</b></span><small>ကိုယ်ရေးအချက်အလက်လုံခြုံရေးအတွက် public tracking တွင် Product နှင့် customer အချက်အလက်မပြပါ။</small></footer></section>;
}
