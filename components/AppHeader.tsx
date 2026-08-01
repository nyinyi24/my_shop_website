"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/", label: "ပင်မ" }, { href: "/products", label: "ထုတ်ကုန်များ" },
  { href: "/orders", label: "အော်ဒါစစ်ရန်" }, { href: "/announcements", label: "ကြေညာချက်များ" },
  { href: "/reviews", label: "သုံးသပ်ချက်များ" },
];
type HeaderUser = { name: string; email: string; email_verified_at?: string|null; role?: string; is_main_admin?: boolean; avatar_url?: string | null };

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [hash, setHash] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setHash(location.hash);
    const syncScroll = () => setScrolled(window.scrollY > 18);
    const timer = setTimeout(() => {
      const token = sessionStorage.getItem("eni_auth_token"); setAuthenticated(Boolean(token));
      if (token) {
        const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
        fetch(`${api}/api/v1/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).then(setUser).catch(() => setUser(null));
      }
      sync(); syncScroll();
    }, 0);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setAccountOpen(false); } };
    addEventListener("hashchange", sync); addEventListener("keydown", escape); addEventListener("scroll", syncScroll, { passive: true });
    return () => { clearTimeout(timer); removeEventListener("hashchange", sync); removeEventListener("keydown", escape); removeEventListener("scroll", syncScroll); };
  }, []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; document.documentElement.style.colorScheme = next; localStorage.setItem("eni-theme", next);
  }
  async function logout() {
    const token = sessionStorage.getItem("eni_auth_token");
    const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    try { if (token) await fetch(`${api}/api/v1/logout`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); }
    finally { sessionStorage.removeItem("eni_auth_token"); localStorage.removeItem("eni_remembered_auth"); location.assign("/login"); }
  }

  return <header className={`app-header${scrolled ? " is-scrolled" : ""}`}>
    <Link href="/" className="brand" aria-label="ENI Premium Store"><span className="brand-crown"><span>E</span></span><span><b>ENI</b><small>PREMIUM STORE</small></span></Link>
    <nav className={open ? "nav-open" : ""} aria-label="အဓိကမီနူး">{navigation.map(item => { const [path, itemHash] = item.href.split("#"); const active = itemHash ? pathname === path && hash === `#${itemHash}` : item.href === "/" ? pathname === "/" && !hash : pathname.startsWith(item.href); return <Link href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)} key={item.href}>{item.label}</Link>; })}</nav>
    <div className="header-tools">
      <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="အရောင်ပြောင်းရန်"><span className="sun">☀</span><span className="moon">☾</span></button>
      {["staff","admin"].includes(user?.role||"") && <Link href="/admin" className="admin-header-link"><span>{user?.is_main_admin?"Main Admin":user?.role==="staff"?"Staff":"Admin"}</span></Link>}
      {authenticated && <div className="account-menu">
        <button className={`icon-btn account-link${accountOpen ? " active" : ""}`} onClick={() => setAccountOpen(!accountOpen)}>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6"/></svg>}</button>
        {accountOpen && <><button className="account-menu-scrim" onClick={() => setAccountOpen(false)} /><div className="account-dropdown">
          <header>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : <span>{user?.name?.[0]?.toUpperCase() || "E"}</span>}<div><b>{user?.name}</b><small>{user?.email}</small></div></header>
          <Link href="/dashboard">Dashboard <span>›</span></Link>
          <Link href="/profile">Profile <span>›</span></Link>
          <Link href="/settings">Settings <span>›</span></Link>
          <Link href="/security">Login Security <span>›</span></Link>
          <button className="account-dropdown-logout" onClick={() => void logout()}>Logout <span>→</span></button>
        </div></>}
      </div>}
      {authenticated === false && <Link href="/login" className="gold-btn compact">ဝင်ရောက်ရန်</Link>}
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-expanded={open}>☰</button>
    </div>
    {open && <button className="nav-scrim" onClick={() => setOpen(false)} />}
    {authenticated && user && !user.email_verified_at && <div className="email-verification-banner"><span>!</span><p><b>Email verify မလုပ်ရသေးပါ</b><small>Order တင်နိုင်ရန် သင့် email ထဲက verification link ကိုနှိပ်ပေးပါ။</small></p><Link href="/verify-email">Email Verify လုပ်ရန် →</Link></div>}
  </header>;
}
