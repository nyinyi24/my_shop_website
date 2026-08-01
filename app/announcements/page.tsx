"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string | null;
  updated_at?: string;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    fetch(`${apiUrl}/api/v1/announcements`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(payload => setAnnouncements(payload.data || payload))
      .catch(() => setError("ကြေညာချက်များ ရယူ၍မရပါ။ Backend server ကို စစ်ဆေးပါ။"))
      .finally(() => setLoading(false));
  }, []);

  return <main className="announcements-page">
    <AppHeader />
    <section className="announcements-hero">
      <span>STORE UPDATES</span>
      <h1>ကြေညာချက်များ</h1>
      <p>ENI Premium Store ၏ နောက်ဆုံးရသတင်းများ၊ ဝန်ဆောင်မှုအပြောင်းအလဲများနှင့် အရေးကြီးအသိပေးချက်များ။</p>
    </section>
    <section className="announcements-content">
      {loading && <div className="announcements-state">ကြေညာချက်များ ရယူနေသည်…</div>}
      {error && <div className="announcements-state error">{error}</div>}
      {!loading && !error && !announcements.length && <div className="announcements-empty"><span>◌</span><h2>ကြေညာချက် မရှိသေးပါ</h2><p>အသစ်တင်သည့် ကြေညာချက်များကို ဒီနေရာတွင် ဖော်ပြပါမည်။</p></div>}
      {announcements.length > 0 && <div className="announcements-list">{announcements.map((announcement, index) => <article key={announcement.id}>
        <div className="announcement-number">{String(index + 1).padStart(2, "0")}</div>
        <div className="announcement-copy">
          <header><span>{index === 0 ? "နောက်ဆုံးရ" : "အသိပေးချက်"}</span><time>{announcement.created_at ? new Intl.DateTimeFormat("my-MM", { dateStyle: "long", timeZone: "Asia/Yangon" }).format(new Date(announcement.created_at)) : "ရက်စွဲမရှိသေးပါ"}</time></header>
          <h2>{announcement.title}</h2>
          <p>{announcement.message}</p>
        </div>
      </article>)}</div>}
    </section>
    <Footer />
  </main>;
}
