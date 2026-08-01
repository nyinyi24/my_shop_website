"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type Mode = "login" | "register";
type Fields = { name: string; email: string; password: string; confirmPassword: string };
type Errors = Partial<Record<keyof Fields | "form", string>>;
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [fields, setFields] = useState<Fields>({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  function update(name: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setShowPassword(false);
  }

  function validate() {
    const next: Errors = {};
    if (mode === "register" && fields.name.trim().length < 2) next.name = "အမည် အနည်းဆုံး ၂ လုံး ဖြည့်ပါ။";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) next.email = "အသုံးပြုနိုင်သော email ဖြည့်ပါ။";
    if (fields.password.length < 8) next.password = "Password အနည်းဆုံး ၈ လုံး လိုအပ်သည်။";
    if (mode === "register" && !/(?=.*[A-Za-z])(?=.*\d)/.test(fields.password)) next.password = "စာလုံးနှင့် ဂဏန်း အနည်းဆုံးတစ်လုံးစီ ပါရမည်။";
    if (mode === "register" && fields.confirmPassword !== fields.password) next.confirmPassword = "Password နှစ်ခု မတူပါ။";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (!apiUrl) return setErrors({ form: "Backend API URL မသတ်မှတ်ရသေးပါ။" });
    setLoading(true);
    setErrors({});
    try {
      const body = mode === "register"
        ? { name: fields.name.trim(), email: fields.email.trim(), password: fields.password, password_confirmation: fields.confirmPassword }
        : { email: fields.email.trim(), password: fields.password, remember };
      const response = await fetch(`${apiUrl}/api/v1/${mode === "register" ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validation = data.errors as Record<string, string[]> | undefined;
        const remaining = typeof data.attempts_remaining === "number" ? ` နောက်ထပ် ${data.attempts_remaining} ကြိမ် ကြိုးစားနိုင်ပါတယ်။` : "";
        return setErrors({ form: validation ? Object.values(validation).flat()[0] : (data.message || "အချက်အလက်ကို ပြန်စစ်ပါ။") + remaining });
      }
      if (!data.token) return setErrors({ form: "API response တွင် authentication token မပါပါ။" });
      sessionStorage.setItem("eni_auth_token", data.token);
      if (mode === "login" && remember) localStorage.setItem("eni_remembered_auth", JSON.stringify({ token: data.token, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
      else localStorage.removeItem("eni_remembered_auth");
      window.location.assign("/dashboard");
    } catch {
      setErrors({ form: "Server နှင့် ဆက်သွယ်၍မရပါ။" });
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-shell"><AppHeader /><section className="auth-layout">
    <div className="auth-intro">
      <Link href="/" className="auth-brand"><span>E</span><div><b>ENI</b><small>PREMIUM MEMBER</small></div></Link>
      <div><span className="auth-kicker">CUSTOMER ACCOUNT</span><h1>အော်ဒါအားလုံးကို<br/><em>တစ်နေရာတည်းမှာ</em> စီမံပါ။</h1><p>Order status၊ delivery နဲ့ ဝယ်ယူမှုမှတ်တမ်းတွေကို ကိုယ်ပိုင် account မှာ ပြန်ကြည့်နိုင်ပါတယ်။</p><ul><li><i>01</i><span><b>Order history</b><small>အော်ဒါဟောင်းနှင့် လက်ရှိအခြေအနေ</small></span></li><li><i>02</i><span><b>Delivery access</b><small>ပို့ပြီးသော digital item များ</small></span></li><li><i>03</i><span><b>Account security</b><small>ကိုယ်ပိုင်အကောင့်ဖြင့်သာ ဝင်ရောက်ခြင်း</small></span></li></ul></div>
      <small className="auth-security">အကောင့် password ကို မည်သူ့ကိုမျှ မပေးပါနှင့်။</small>
    </div>
    <div className="auth-form-side">
      <div className="auth-tabs" role="tablist"><button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>အကောင့်ဝင်ရန်</button><button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>အကောင့်ဖွင့်ရန်</button></div>
      <form className="auth-form-card" onSubmit={submit} noValidate>
        <div className="auth-form-head"><span>{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</span><h2>{mode === "login" ? "ပြန်လည်ကြိုဆိုပါတယ်" : "အကောင့်အသစ် ဖွင့်ပါ"}</h2><p>Dashboard သို့ဝင်ရန် အချက်အလက်ဖြည့်ပါ။</p></div>
        {!apiUrl && <div className="auth-config-warning"><span>!</span><p><b>Backend မချိတ်ရသေးပါ</b><small>NEXT_PUBLIC_API_URL သတ်မှတ်ပါ။</small></p></div>}
        {errors.form && <div className="auth-form-error" role="alert">{errors.form}</div>}
        {mode === "register" && <label className={errors.name ? "has-error" : ""}>အမည်အပြည့်အစုံ<input value={fields.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />{errors.name && <small>{errors.name}</small>}</label>}
        <label className={errors.email ? "has-error" : ""}>Email address<input type="email" value={fields.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="name@example.com" />{errors.email && <small>{errors.email}</small>}</label>
        <label className={errors.password ? "has-error" : ""}>Password<div className="password-field"><input type={showPassword ? "text" : "password"} value={fields.password} onChange={(e) => update("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "ဖျောက်" : "ပြ"}</button></div>{errors.password && <small>{errors.password}</small>}</label>
        {mode === "register" && <label className={errors.confirmPassword ? "has-error" : ""}>Password အတည်ပြုရန်<input type={showPassword ? "text" : "password"} value={fields.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" />{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label>}
        <div className="auth-options">{mode === "login" ? <label><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> ဒီ browser မှာ 30 ရက် မှတ်ထားရန်</label> : <small>အကောင့်ဖွင့်ခြင်းဖြင့် Privacy နှင့် Terms ကို သဘောတူသည်။</small>} {mode === "login" && <Link href="/forgot-password">Password မေ့နေပါသလား?</Link>}</div>
        <button className="gold-btn full auth-submit" disabled={loading}>{loading ? "Server သို့ပို့နေသည်…" : mode === "login" ? "အကောင့်ဝင်မည် →" : "အကောင့်ဖွင့်မည် →"}</button>
      </form>
      <Link href="/" className="auth-home-link">← Store ပင်မစာမျက်နှာသို့</Link>
    </div>
  </section></main>;
}
