import Link from "next/link";
import { StoreAvailability } from "@/components/StoreAvailability";

export function Footer() {
  return <footer className="footer">
    <div className="footer-about"><Link href="/" className="brand"><span className="brand-crown"><span>E</span></span><span><b>ENI</b><small>PREMIUM STORE</small></span></Link><p>မြန်မာနိုင်ငံအတွက် ယုံကြည်စိတ်ချရသော Premium Digital Marketplace။ ရှင်းလင်းသောဈေးနှုန်းနှင့် အကူအညီပေးမှုကို ဦးစားပေးပါသည်။</p><StoreAvailability /></div>
    <div><b>ဈေးဝယ်ရန်</b><Link href="/products">ထုတ်ကုန်အားလုံး</Link><Link href="/orders">အော်ဒါအခြေအနေ</Link><Link href="/dashboard">ကျွန်ုပ်၏အကောင့်</Link></div>
    <div><b>အကူအညီ</b><Link href="/#faq">မေးလေ့ရှိသောမေးခွန်းများ</Link><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">Support · @independence_N ↗</a><a href="https://t.me/ENIpremiumstore_bot" target="_blank" rel="noreferrer">Telegram Bot မှလည်း ဝယ်ယူနိုင်ပါသည် · @ENIpremiumstore_bot ↗</a><a href="mailto:enipremiumacc1@gmail.com">enipremiumacc1@gmail.com</a></div>
    <div className="footer-bottom"><span>© 2026 ENI Premium Store. All rights reserved.</span><span>လုံခြုံသောငွေပေးချေမှု · မြန်ဆန်သောအကူအညီ</span></div>
  </footer>;
}
