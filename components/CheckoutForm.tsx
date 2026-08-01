"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { type ApiProduct, toCatalogProduct } from "@/lib/api-catalog";
import { StoreAvailability } from "@/components/StoreAvailability";

type FormFields = { name: string; phone: string; telegram: string; note: string };
type FormErrors = Partial<Record<keyof FormFields | "proof", string>>;
type CreatedOrder = { id: number; order_number: string };
const paymentMethods = [{ id: "kbzpay", mark: "K", name: "KBZ Pay" }, { id: "wavepay", mark: "W", name: "Wave Pay" }, { id: "ayapay", mark: "A", name: "AYA Pay" }];

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const productId = Number(searchParams.get("product"));
  const [product, setProduct] = useState<Product | null>();
  const [method, setMethod] = useState("kbzpay");
  const [quantity, setQuantity] = useState(1);
  const [fields, setFields] = useState<FormFields>({ name: "", phone: "", telegram: "", note: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CreatedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitLock = useRef(false);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    if (!Number.isInteger(productId) || productId < 1) { queueMicrotask(() => setProduct(null)); return; }
    fetch(`${apiUrl}/api/v1/products/${productId}`, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload: ApiProduct) => setProduct(toCatalogProduct(payload)))
      .catch(() => setProduct(null));
  }, [productId]);

  if (product === undefined) return <div className="checkout-loading">Product နှင့် live stock ရယူနေသည်…</div>;

  if (!product) return <section className="checkout-missing"><span>!</span><h2>Product မရွေးရသေးပါ</h2><p>Checkout ဆက်လုပ်ရန် Stock ရှိသော Product တစ်ခုကို အရင်ရွေးပါ။</p><Link href="/products" className="gold-btn compact">Products သို့ပြန်သွားရန်</Link></section>;

  const total = Number(product.price.replace(/[^0-9]/g, "")) * quantity;
  const updateField = (name: keyof FormFields, value: string) => { setFields((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
  function selectProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setErrors((current) => ({ ...current, proof: "PNG/JPG ပုံဖိုင် 5 MB အောက်ကိုသာ ရွေးပါ။" })); return; }
    if (preview) URL.revokeObjectURL(preview);
    setProof(file); setPreview(URL.createObjectURL(file)); setErrors((current) => ({ ...current, proof: undefined }));
  }
  function removeProof() { if (preview) URL.revokeObjectURL(preview); setProof(null); setPreview(null); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || submitting) return;
    const nextErrors: FormErrors = {};
    if (fields.name.trim().length < 2) nextErrors.name = "အမည် အနည်းဆုံး ၂ လုံး ဖြည့်ပါ။";
    if (!/^09\d{7,9}$/.test(fields.phone.replace(/\s/g, ""))) nextErrors.phone = "09 ဖြင့်စသော ဖုန်းနံပါတ်မှန် ဖြည့်ပါ။";
    if (fields.telegram && !/^@[A-Za-z0-9_]{5,32}$/.test(fields.telegram)) nextErrors.telegram = "ဥပမာ @username ပုံစံဖြင့် ဖြည့်ပါ။";
    if (!proof) nextErrors.proof = "ငွေလွှဲ screenshot လိုအပ်ပါသည်။";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const token = sessionStorage.getItem("eni_auth_token");
    if (!token) {
      setSubmitError("Order တင်ရန် အကောင့်ဝင်ထားရန် လိုအပ်ပါသည်။");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      idempotencyKey.current ||= crypto.randomUUID();
      const orderResponse = await fetch(`${apiUrl}/api/v1/orders`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({ product_id: product!.id, quantity, customer_name: fields.name.trim(), phone: fields.phone.replace(/\s/g, ""), telegram_username: fields.telegram.trim() || null, payment_method: method, note: fields.note.trim() || null }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.message || "Order တင်၍မရပါ။");
      const paymentData = new FormData();
      paymentData.append("proof", proof!);
      const paymentResponse = await fetch(`${apiUrl}/api/v1/orders/${order.id}/payment`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, body: paymentData });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.message || "Payment screenshot ပို့၍မရပါ။");
      setSubmitted({ id: order.id, order_number: order.order_number });
      idempotencyKey.current = null;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "Order တင်ရာတွင် အမှားဖြစ်နေပါသည်။");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (submitted) return <section className="checkout-success"><span>✓</span><small>ORDER SUBMITTED</small><h2>ဝယ်ယူမှု အောင်မြင်ပါသည်</h2><p>Order နှင့် ငွေလွှဲပြေစာကို လက်ခံရရှိပါပြီ။ Admin စစ်ဆေးအတည်ပြုပြီးပါက account အချက်အလက်ကို ပို့ပေးပါမည်။</p><StoreAvailability variant="banner"/><div><b>{product.name}</b><span>{total.toLocaleString()} ကျပ်</span></div><div><b>Order ID</b><span>{submitted.order_number}</span></div><Link href="/orders" className="gold-btn">Order အခြေအနေစစ်ရန်</Link><Link href="/products" className="ghost-btn">Products သို့ပြန်ရန်</Link></section>;

  return <form className="checkout-layout" onSubmit={submit} noValidate>
    <StoreAvailability variant="banner" />
    <div className="checkout-form-column">
      <section className="checkout-box"><div className="checkout-box-head"><span>01</span><div><h2>ဆက်သွယ်ရန်အချက်အလက်</h2><p>Delivery နှင့် order update အတွက် အသုံးပြုပါမည်။</p></div></div><div className="checkout-fields"><label className={errors.name ? "has-error" : ""}>အမည်အပြည့်အစုံ <b>*</b><input value={fields.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="ဥပမာ မောင်မောင်" />{errors.name && <small>{errors.name}</small>}</label><label className={errors.phone ? "has-error" : ""}>ဖုန်းနံပါတ် <b>*</b><input value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxxx" />{errors.phone && <small>{errors.phone}</small>}</label><label className={`full-field ${errors.telegram ? "has-error" : ""}`}>Telegram username <em>မဖြစ်မနေမဟုတ်ပါ</em><input value={fields.telegram} onChange={(event) => updateField("telegram", event.target.value)} placeholder="@username" />{errors.telegram && <small>{errors.telegram}</small>}</label></div></section>
      <section className="checkout-box"><div className="checkout-box-head"><span>02</span><div><h2>ငွေပေးချေမှုနည်းလမ်း</h2><p>အသုံးပြုမည့် wallet ကို ရွေးပါ။</p></div></div><div className="checkout-payment-methods">{paymentMethods.map((item) => <button type="button" className={method === item.id ? "active" : ""} onClick={() => setMethod(item.id)} key={item.id}><span>{item.mark}</span><b>{item.name}</b><i>{method === item.id ? "●" : "○"}</i></button>)}</div><div className="payment-account-card"><div className="payment-account-icon">₭</div><div className="payment-account-details"><span>ငွေလွှဲရန် ဖုန်းနံပါတ်</span><b>09975374020</b><strong>Account Name · NNML</strong><small>KPAY · Wave Pay · AYA Pay သုံးမျိုးလုံး အသုံးပြုနိုင်ပါသည်။</small></div><button type="button" onClick={() => navigator.clipboard?.writeText("09975374020")} title="ဖုန်းနံပါတ်ကူးရန်">Copy</button></div></section>
      <section className="checkout-box"><div className="checkout-box-head"><span>03</span><div><h2>Payment screenshot</h2><p>Transaction အပြည့်အစုံ မြင်ရသောပုံကို ရွေးပါ။</p></div></div>{preview ? <div className="proof-preview"><img src={preview} alt="Payment screenshot preview" /><div><b>{proof?.name}</b><small>{proof ? `${(proof.size / 1024 / 1024).toFixed(2)} MB` : ""}</small><button type="button" onClick={removeProof}>ပုံဖယ်ရှားရန်</button></div></div> : <label className={`proof-upload ${errors.proof ? "has-error" : ""}`}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectProof} /><span>＋</span><b>Screenshot ရွေးရန်</b><small>PNG, JPG, WEBP · အများဆုံး 5 MB</small></label>}{errors.proof && <p className="field-error">{errors.proof}</p>}<label className="checkout-note">Order မှတ်ချက် <em>မဖြစ်မနေမဟုတ်ပါ</em><textarea value={fields.note} onChange={(event) => updateField("note", event.target.value)} maxLength={500} placeholder="Delivery အတွက် သိထားသင့်တာရှိရင် ရေးပါ…" /><small>{fields.note.length}/500</small></label></section>
    </div>
    <aside className="checkout-summary"><h2>အော်ဒါအကျဉ်းချုပ်</h2><div className="checkout-product"><span className={`product-logo ${product.accent}`}>{product.icon}</span><div><b>{product.name}</b><small>{product.categoryLabel} · {product.warranty}</small></div></div><div className="quantity-row"><span>အရေအတွက်</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity === 1}>−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity(Math.min(Math.min(10, product.stock), quantity + 1))} disabled={quantity >= Math.min(10, product.stock)}>＋</button></div></div><div className="summary-prices"><p><span>တစ်ခုဈေး</span><b>{product.price}</b></p><p><span>ဝန်ဆောင်ခ</span><b>0 ကျပ်</b></p></div><div className="summary-grand-total"><span>စုစုပေါင်း</span><b>{total.toLocaleString()} ကျပ်</b></div><button className="gold-btn full" type="submit">အချက်အလက်စစ်ပြီး တင်မည် →</button><small className="checkout-consent">ဆက်လုပ်ခြင်းဖြင့် Product စည်းကမ်းနှင့် အာမခံအခြေအနေကို ဖတ်ပြီးကြောင်း သဘောတူသည်။</small><Link href={`/products/${product.id}`}>← Product အသေးစိတ်သို့ပြန်ရန်</Link></aside>
    {submitting && <p className="checkout-submit-state">Order တင်နေသည်… ခဏစောင့်ပေးပါ။</p>}
    {submitError && <p className="checkout-submit-error">{submitError} {!sessionStorage.getItem("eni_auth_token") && <Link href="/login">အကောင့်ဝင်ရန် →</Link>}</p>}
  </form>;
}
