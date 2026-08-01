"use client";

import Link from "next/link";
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { type ApiProduct, toCatalogProduct } from "@/lib/api-catalog";
import type { Product } from "@/lib/catalog";

type User = { id: number; name: string; email: string; created_at?: string };
type OrderItem = { id: number; product_name: string; quantity: number; unit_price: number | string; delivery_payload: string | null; service_expires_at?: string | null };
type Review = { id: number; rating: number; comment: string };
type Payment = { id: number; status: string; rejection_reason?: string | null; created_at: string };
type StatusHistory = { id: number; event: string; status: string; payment_status: string; message: string; created_at: string };
type Order = { id: number; order_number: string; total_amount: number | string; payment_status: string; status: string; expires_at?: string | null; created_at: string; items: OrderItem[]; payments?: Payment[]; status_history?: StatusHistory[]; review?: Review | null };
type UserNotification = { id: string; data: { title: string; message: string; category?: string; action_url?: string; order_number?: string }; read_at: string | null; created_at: string };
type NotificationFilter = "all" | "unread" | "order" | "service";
type Tab = "overview" | "orders" | "saved" | "notifications";
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const statusLabels: Record<string, string> = { pending: "စောင့်ဆိုင်း", approved: "အတည်ပြုပြီး", rejected: "ပယ်ချထား", processing: "ပြင်ဆင်နေ", completed: "ပြီးမြောက်", cancelled: "ပယ်ဖျက်" };

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadDashboard = useCallback(async () => {
    const token = sessionStorage.getItem("eni_auth_token");
    if (!apiUrl) { setError("Backend API URL မသတ်မှတ်ရသေးပါ။"); setLoading(false); return; }
    if (!token) { setError("Dashboard ကြည့်ရန် အကောင့်ဝင်ရန်လိုအပ်ပါသည်။"); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const options = { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } };
      const [userResponse, orderResponse, savedResponse, notificationResponse] = await Promise.all([fetch(`${apiUrl}/api/v1/me`, options), fetch(`${apiUrl}/api/v1/orders`, options), fetch(`${apiUrl}/api/v1/saved-products`, options), fetch(`${apiUrl}/api/v1/notifications`, options)]);
      if ([userResponse,orderResponse,savedResponse,notificationResponse].some(response=>response.status===401)) { sessionStorage.removeItem("eni_auth_token"); localStorage.removeItem("eni_remembered_auth"); throw new Error("SESSION_EXPIRED"); }
      if (![userResponse,orderResponse,savedResponse,notificationResponse].every(response=>response.ok)) throw new Error("API_ERROR");
      const [userData, orderData, savedData, notificationData] = await Promise.all([userResponse.json(), orderResponse.json(), savedResponse.json(), notificationResponse.json()]);
      setUser(userData); setOrders(Array.isArray(orderData) ? orderData : orderData.data || []); setSavedProducts((savedData.data||savedData).map((item:ApiProduct)=>toCatalogProduct(item))); setNotifications(notificationData.data||notificationData);
    } catch (reason) { setError(reason instanceof Error && reason.message === "SESSION_EXPIRED" ? "Session သက်တမ်းကုန်သွားပါပြီ။ ပြန်လည်အကောင့်ဝင်ပါ။" : "Dashboard data ရယူ၍မရပါ။ Backend server နှင့် network ကို စစ်ပါ။"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    const savedChanged = () => void loadDashboard();
    window.addEventListener("eni:saved-products-changed", savedChanged);
    return () => { window.clearTimeout(timer); window.removeEventListener("eni:saved-products-changed", savedChanged); };
  }, [loadDashboard]);

  const totals = useMemo(() => ({ all: orders.length, completed: orders.filter((order) => order.status === "completed").length, active: orders.filter((order) => ["pending", "approved", "processing"].includes(order.status)).length, spent: orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + Number(order.total_amount), 0) }), [orders]);
  const unreadNotifications = notifications.filter(item => !item.read_at).length;
  const filteredNotifications = notifications.filter(item => notificationFilter === "all" || (notificationFilter === "unread" ? !item.read_at : (item.data.category || "service") === notificationFilter));
  async function logout() {
    const token = sessionStorage.getItem("eni_auth_token"); setLoggingOut(true);
    try { if (apiUrl && token) await fetch(`${apiUrl}/api/v1/logout`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); } finally { sessionStorage.removeItem("eni_auth_token"); localStorage.removeItem("eni_remembered_auth"); window.location.assign("/login"); }
  }
  async function readNotification(notification: UserNotification) { const token=sessionStorage.getItem("eni_auth_token");if(!apiUrl||!token||notification.read_at)return;const response=await fetch(`${apiUrl}/api/v1/notifications/${notification.id}/read`,{method:"PATCH",headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});if(response.ok)setNotifications(items=>items.map(item=>item.id===notification.id?{...item,read_at:new Date().toISOString()}:item)); }
  async function readAllNotifications() { const token=sessionStorage.getItem("eni_auth_token");if(!apiUrl||!token||!unreadNotifications)return;const response=await fetch(`${apiUrl}/api/v1/notifications/read-all`,{method:"PATCH",headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});if(response.ok)setNotifications(items=>items.map(item=>({...item,read_at:item.read_at||new Date().toISOString()}))); }

  if (loading) return <main><AppHeader /><section className="dashboard-state"><span className="dashboard-spinner"/><h2>Dashboard ရယူနေသည်…</h2><p>အကောင့်နှင့် အော်ဒါအချက်အလက်များကို စစ်ဆေးနေပါသည်။</p></section></main>;
  if (error || !user) return <main><AppHeader /><section className="dashboard-state error"><span>!</span><h2>Dashboard ဖွင့်၍မရပါ</h2><p>{error || "အသုံးပြုသူအချက်အလက် မတွေ့ပါ။"}</p><div><Link href="/login" className="gold-btn compact">အကောင့်ဝင်ရန်</Link>{sessionStorage.getItem("eni_auth_token") && <button className="ghost-btn" onClick={() => void loadDashboard()}>ထပ်မံကြိုးစားရန်</button>}</div></section><Footer /></main>;

  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <main className="customer-dashboard"><AppHeader /><section className="customer-dashboard-shell">
    <aside className="customer-sidebar"><div className="customer-profile"><span>{initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><nav>{([ ["overview", "▦", "ခြုံငုံကြည့်ရန်"], ["orders", "▤", "အော်ဒါများ"], ["saved", "♡", "သိမ်းထားသည်များ"], ["notifications", "○", "အသိပေးချက်များ"] ] as [Tab,string,string][]).map(([id, icon, label]) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><i>{icon}</i>{label}{id === "orders" && orders.length > 0 && <em>{orders.length}</em>}{id === "notifications" && unreadNotifications > 0 && <em className="unread-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</em>}</button>)}</nav><div className="customer-sidebar-help"><b>အကူအညီလိုပါသလား?</b><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">@independence_N ↗</a></div><button className="customer-logout" onClick={logout} disabled={loggingOut}>{loggingOut ? "ထွက်နေသည်…" : "အကောင့်မှထွက်ရန်"}</button></aside>
    <div className="customer-content"><header className="customer-heading"><div><span>CUSTOMER ACCOUNT</span><h1>မင်္ဂလာပါ၊ {user.name}</h1><p>သင့်အော်ဒါနဲ့ delivery အခြေအနေတွေကို ဒီနေရာမှာ ကြည့်နိုင်ပါတယ်။</p></div><Link href="/products" className="gold-btn compact">＋ Product ဝယ်ရန်</Link></header>
      {tab === "overview" && <><div className="customer-stats"><article><span>စုစုပေါင်းအော်ဒါ</span><b>{totals.all}</b><small>Order အားလုံး</small></article><article><span>ပြီးမြောက်ပြီး</span><b>{totals.completed}</b><small>Delivery ရရှိပြီး</small></article><article><span>ဆောင်ရွက်နေဆဲ</span><b>{totals.active}</b><small>စစ်ဆေး/ပြင်ဆင်နေ</small></article><article><span>ပြီးမြောက်တန်ဖိုး</span><b>{totals.spent.toLocaleString()}</b><small>ကျပ်</small></article></div><DashboardPanel title="နောက်ဆုံးအော်ဒါများ" action={<button onClick={() => setTab("orders")}>အားလုံးကြည့်ရန် →</button>}>{orders.length ? <OrderTable orders={orders.slice(0, 5)} onReviewsChanged={loadDashboard} /> : <OrdersEmpty />}</DashboardPanel></>}
      {tab === "orders" && <DashboardPanel title="အော်ဒါမှတ်တမ်း" action={<span>{orders.length} Orders</span>}>{orders.length ? <OrderTable orders={orders} onReviewsChanged={loadDashboard} /> : <OrdersEmpty />}</DashboardPanel>}
      {tab === "saved" && (savedProducts.length ? <DashboardPanel title="သိမ်းထားသော Products" action={<span>{savedProducts.length} Products</span>}><div className="dashboard-saved-grid">{savedProducts.map(product=><ProductCard product={product} key={product.id}/>)}</div></DashboardPanel> : <FeatureEmpty icon="♡" title="သိမ်းထားသော Product မရှိသေးပါ" text="Product card ပေါ်က နှလုံးပုံကိုနှိပ်ပြီး နောက်မှပြန်ကြည့်ရန် သိမ်းထားနိုင်ပါတယ်။" action={<Link href="/products" className="gold-btn compact">Products ကြည့်ရန်</Link>} />)}
      {tab === "notifications" && (notifications.length ? <DashboardPanel title="အသိပေးချက်များ" action={<button disabled={!unreadNotifications} onClick={()=>void readAllNotifications()}>အားလုံးဖတ်ပြီး ({unreadNotifications})</button>}><div className="notification-filters">{([ ["all","အားလုံး"], ["unread","မဖတ်ရသေး"], ["order","Order"], ["service","Service"] ] as [NotificationFilter,string][]).map(([value,label])=><button type="button" className={notificationFilter===value?"active":""} onClick={()=>setNotificationFilter(value)} key={value}>{label}</button>)}</div>{filteredNotifications.length?<div className="customer-notifications">{filteredNotifications.map(notification=><button type="button" className={notification.read_at?"read":"unread"} onClick={()=>void readNotification(notification)} key={notification.id}><i>{notification.read_at?"○":"●"}</i><div><b>{notification.data.title}</b>{notification.data.order_number&&<small>{notification.data.order_number}</small>}<p>{notification.data.message}</p><time>{new Intl.DateTimeFormat("my-MM",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Yangon"}).format(new Date(notification.created_at))}</time></div></button>)}</div>:<div className="notification-filter-empty">ဒီ filter အတွက် အသိပေးချက်မရှိသေးပါ။</div>}</DashboardPanel> : <FeatureEmpty icon="○" title="အသိပေးချက် မရှိသေးပါ" text="Admin မှပို့သော store နှင့် order အသိပေးချက်များကို ဒီနေရာမှာ ပြပါမည်။" />)}
    </div>
  </section><Footer /></main>;
}

function DashboardPanel({ title, action, children }: { title: string; action: React.ReactNode; children: React.ReactNode }) { return <section className="customer-panel"><div className="customer-panel-head"><h2>{title}</h2>{action}</div>{children}</section>; }
function OrdersEmpty() { return <div className="dashboard-empty"><span>▤</span><h3>အော်ဒါမရှိသေးပါ</h3><p>Product တစ်ခုရွေးပြီး အော်ဒါစတင်နိုင်ပါတယ်။</p><Link href="/products" className="gold-btn compact">Products ကြည့်ရန်</Link></div>; }
function FeatureEmpty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) { return <section className="customer-panel dashboard-empty feature-empty"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action}</section>; }
function OrderTable({ orders, onReviewsChanged }: { orders: Order[]; onReviewsChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Order | null>(null);
  const [busyReview, setBusyReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [retryingPayment, setRetryingPayment] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState("");

  async function retryPayment(order: Order, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setPaymentError("PNG/JPG ပုံဖိုင် 5 MB အောက်ကိုသာ ရွေးပါ။");
      return;
    }
    const token = sessionStorage.getItem("eni_auth_token");
    if (!apiUrl || !token) { setPaymentError("အကောင့်ပြန်ဝင်ရန် လိုအပ်ပါသည်။"); return; }
    setRetryingPayment(order.id); setPaymentError("");
    try {
      const body = new FormData();
      body.append("proof", file);
      const response = await fetch(`${apiUrl}/api/v1/orders/${order.id}/payment`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, body });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || "Payment screenshot တင်၍မရပါ။"); }
      await onReviewsChanged();
    } catch (reason) { setPaymentError(reason instanceof Error ? reason.message : "Payment screenshot တင်၍မရပါ။"); }
    finally { setRetryingPayment(null); }
  }

  async function deleteReview(order: Order) {
    if (!order.review || !window.confirm("ဒီ Review ကို ဖျက်မှာ သေချာပါသလား?")) return;
    const token = sessionStorage.getItem("eni_auth_token");
    if (!apiUrl || !token) return;
    setBusyReview(true); setReviewError("");
    try {
      const response = await fetch(`${apiUrl}/api/v1/reviews/${order.review.id}`, { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      await onReviewsChanged();
    } catch { setReviewError("Review ဖျက်၍မရပါ။ ထပ်မံကြိုးစားပါ။"); }
    finally { setBusyReview(false); }
  }

  return <div className="customer-orders">{reviewError && <div className="dashboard-review-error">{reviewError}</div>}{paymentError && <div className="dashboard-review-error">{paymentError}</div>}<table><thead><tr><th>Order</th><th>Products</th><th>တန်ဖိုး</th><th>Payment</th><th>အခြေအနေ</th><th>Review</th><th>ရက်စွဲ</th></tr></thead><tbody>{orders.map(order => { const activePayment=order.payments?.some(payment=>["pending","approved"].includes(payment.status));const rejectedPayment=[...(order.payments||[])].reverse().find(payment=>payment.status==="rejected");const canRetry=["pending","rejected"].includes(order.status)&&!activePayment;return <Fragment key={order.id}><tr><td><b>{order.order_number}</b><details className="order-timeline"><summary>Timeline ကြည့်ရန်</summary><div>{order.status_history?.length?order.status_history.map((history,index)=><article key={history.id}><i>{index+1}</i><span><b>{history.message}</b><time>{new Intl.DateTimeFormat("my-MM",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Yangon"}).format(new Date(history.created_at))}</time></span></article>):<small>မှတ်တမ်းမရှိသေးပါ</small>}</div></details></td><td><span>{order.items?.[0]?.product_name || "Product"}</span>{order.items?.length > 1 && <small>＋{order.items.length - 1} ခု</small>}</td><td>{Number(order.total_amount).toLocaleString()} ကျပ်</td><td><div className="payment-retry-cell"><span className={`dashboard-status ${order.payment_status}`}>{statusLabels[order.payment_status] || order.payment_status}</span>{order.expires_at&&<OrderExpiryCountdown expiresAt={order.expires_at}/>} {rejectedPayment?.rejection_reason&&<small>{rejectedPayment.rejection_reason}</small>}{canRetry&&<label className="payment-retry-button">{retryingPayment===order.id?"တင်နေသည်…":rejectedPayment?"Screenshot ပြန်တင်ရန်":"Screenshot တင်ရန်"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={retryingPayment!==null} onChange={event=>void retryPayment(order,event.target.files?.[0])}/></label>}</div></td><td><span className={`dashboard-status ${order.status}`}>{statusLabels[order.status] || order.status}</span></td><td>{order.status === "completed" ? order.review ? <div className="order-review-actions"><span>{"★".repeat(order.review.rating)}</span><button type="button" onClick={() => setEditing(order)}>Edit</button><button type="button" className="danger" disabled={busyReview} onClick={() => void deleteReview(order)}>Delete</button></div> : <button type="button" className="review-write-button" onClick={() => setEditing(order)}>Review ရေးရန်</button> : <span className="review-unavailable">—</span>}</td><td>{new Intl.DateTimeFormat("my-MM", { dateStyle: "medium" }).format(new Date(order.created_at))}</td></tr>{order.items?.some(item => item.delivery_payload) && <tr className="delivery-info-row"><td colSpan={7}><details><summary>🔐 Account info ကြည့်ရန်</summary>{order.items.map(item => item.delivery_payload && <section key={item.id}><b>{item.product_name}</b><pre>{item.delivery_payload}</pre><button type="button" onClick={() => navigator.clipboard?.writeText(item.delivery_payload || "")}>Copy account info</button></section>)}</details></td></tr>}</Fragment>})}</tbody></table>{editing && <ReviewDialog order={editing} close={() => setEditing(null)} saved={async () => { setEditing(null); await onReviewsChanged(); }} />}</div>;
}

function OrderExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return <small className={`order-expiry${remaining === 0 ? " expired" : ""}`}>{remaining === 0 ? "Payment တင်ချိန်ကုန်ပါပြီ" : `Payment တင်ရန် ${minutes}:${String(seconds).padStart(2, "0")} ကျန်`}</small>;
}

function ReviewDialog({ order, close, saved }: { order: Order; close: () => void; saved: () => Promise<void> }) {
  const [rating, setRating] = useState(order.review?.rating || 5);
  const [comment, setComment] = useState(order.review?.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem("eni_auth_token");
    if (!apiUrl || !token) { setError("အကောင့်ပြန်ဝင်ရန်လိုအပ်ပါသည်။"); return; }
    setBusy(true); setError("");
    try {
      const editing = Boolean(order.review);
      const path = editing ? `reviews/${order.review?.id}` : `orders/${order.id}/review`;
      const response = await fetch(`${apiUrl}/api/v1/${path}`, { method: editing ? "PATCH" : "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ rating, comment }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || "Review သိမ်း၍မရပါ။"); }
      await saved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review သိမ်း၍မရပါ။"); }
    finally { setBusy(false); }
  }

  return <div className="review-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><form className="review-modal" onSubmit={submit}><header><div><small>{order.order_number}</small><h2>{order.review ? "Review ပြင်ရန်" : "Review ရေးရန်"}</h2></div><button type="button" onClick={close}>×</button></header><div className="review-modal-product">{order.items?.[0]?.product_name || "Digital Product"}</div><fieldset><legend>Rating ရွေးပါ</legend><div className="review-rating">{[1,2,3,4,5].map(value => <button type="button" className={value <= rating ? "active" : ""} onClick={() => setRating(value)} aria-label={`${value} stars`} key={value}>★</button>)}</div></fieldset><label>သုံးသပ်ချက်<textarea required minLength={3} maxLength={1000} rows={6} value={comment} onChange={event => setComment(event.target.value)} placeholder="Product နဲ့ service အပေါ် သင့်အတွေ့အကြုံကို ရေးပေးပါ…"/><small>{comment.length}/1000</small></label>{error && <p className="review-modal-error">{error}</p>}<footer><button type="button" onClick={close}>Cancel</button><button className="gold-btn compact" disabled={busy || comment.trim().length < 3}>{busy ? "သိမ်းနေသည်…" : order.review ? "ပြင်ဆင်မှုသိမ်းမည်" : "Review တင်မည်"}</button></footer></form></div>;
}
