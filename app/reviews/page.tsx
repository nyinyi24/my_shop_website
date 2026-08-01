"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

type Review = {
  id: number;
  rating: number;
  comment: string;
  verified_buyer: boolean;
  created_at: string;
  user?: { name: string };
  order?: { items?: { product_name: string }[] };
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/reviews`, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(payload => setReviews(payload.data || payload))
      .catch(() => setError("Reviews များ ရယူ၍မရပါ။ Backend server ကို စစ်ဆေးပါ။"))
      .finally(() => setLoading(false));
  }, []);

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews]);

  return <main className="reviews-page">
    <AppHeader />
    <section className="reviews-hero"><span>CUSTOMER REVIEWS</span><h1>ဝယ်ယူသူများ၏<br/>သုံးသပ်ချက်များ</h1><p>ပြီးမြောက်ထားသော Order များမှ အတည်ပြုထားသည့် ဝယ်ယူသူများ၏ အတွေ့အကြုံများကို ဖတ်ရှုနိုင်ပါသည်။</p><div><b>{average ? average.toFixed(1) : "—"}</b><span><i>{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</i><small>{reviews.length} verified reviews</small></span></div></section>
    <section className="reviews-content">
      {loading && <div className="reviews-state">Reviews ရယူနေသည်…</div>}
      {error && <div className="reviews-state error">{error}</div>}
      {!loading && !error && !reviews.length && <div className="reviews-empty"><span>☆</span><h2>သုံးသပ်ချက် မရှိသေးပါ</h2><p>Completed Order ရရှိထားသော customer များ review ပေးပြီးနောက် ဒီနေရာတွင် ဖော်ပြပါမည်။</p></div>}
      {reviews.length > 0 && <div className="reviews-grid">{reviews.map(review => <article key={review.id}><header><div className="review-avatar">{review.user?.name?.slice(0, 1).toUpperCase() || "C"}</div><div><b>{review.user?.name || "ENI Customer"}</b><small>{review.verified_buyer ? "✓ Verified buyer" : "Customer"}</small></div><time>{new Intl.DateTimeFormat("my-MM", { dateStyle: "medium" }).format(new Date(review.created_at))}</time></header><div className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</div><p>{review.comment}</p><footer>{review.order?.items?.[0]?.product_name || "Digital Product"}</footer></article>)}</div>}
    </section>
    <Footer />
  </main>;
}
