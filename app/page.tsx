import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { StoreAvailability } from "@/components/StoreAvailability";
import { categories, products } from "@/lib/catalog";

const faqs = [
  ["အော်ဒါတင်ပြီး ဘယ်လောက်ကြာရင် ရမလဲ?", "Product တစ်ခုချင်းစီ၏ delivery ခန့်မှန်းချိန် မတူပါ။ ငွေပေးချေမှုကို စစ်ဆေးပြီးနောက် အော်ဒါစာမျက်နှာတွင် အခြေအနေကို အဆင့်ဆင့် ဖော်ပြပေးပါမည်။"],
  ["အာမခံက ဘယ်လိုအကျုံးဝင်ပါသလဲ?", "Product card တွင် အာမခံအမျိုးအစားကို ဖော်ပြထားပါသည်။ ဝယ်ယူမီ သက်တမ်း၊ replacement အခြေအနေနှင့် မပါဝင်သောအချက်များကို သေချာစစ်ဆေးပါ။"],
  ["ငွေပေးချေပြီးကြောင်း ဘယ်လိုအတည်ပြုမလဲ?", "Checkout တွင် ရွေးထားသော payment method သို့ လွှဲပြီး transaction screenshot ကို အော်ဒါနှင့်အတူ တင်ရပါမည်။ Admin စစ်ဆေးပြီးမှ အတည်ပြုမည်။"],
  ["အော်ဒါအခြေအနေကို ဘယ်မှာစစ်နိုင်လဲ?", "အော်ဒါနံပါတ်ဖြင့် Order Tracking စာမျက်နှာတွင် စစ်နိုင်ပြီး အကောင့်ဝင်ထားသူများက Dashboard တွင် မှတ်တမ်းအားလုံး ကြည့်နိုင်ပါသည်။"],
];

export default function Home() {
  const featured = products.filter((product) => product.popular).slice(0, 4);
  return <main className="home-page">
    <AppHeader />
    <section className="home-hero">
      <div className="home-hero-copy">
        <span className="home-kicker"><i /> မြန်မာနိုင်ငံအတွက် Digital Marketplace</span>
        <h1>လိုအပ်တဲ့ digital service ကို <em>ရှင်းရှင်းလင်းလင်း</em> ရွေးချယ်ပါ။</h1>
        <p>ဈေးနှုန်း၊ stock၊ delivery ခန့်မှန်းချိန်နှင့် အာမခံအခြေအနေကို မဝယ်ခင် သိနိုင်အောင် ဖော်ပြထားပါတယ်။</p>
        <div className="home-actions"><Link href="/products" className="gold-btn">ထုတ်ကုန်များကြည့်ရန် <span>→</span></Link><Link href="/orders" className="ghost-btn">အော်ဒါစစ်ရန်</Link></div>
        <div className="home-assurances"><span><b>01</b> ရှင်းလင်းသောဈေးနှုန်း</span><span><b>02</b> Payment စစ်ဆေးမှု</span><span><b>03</b> Order tracking</span></div>
      </div>
      <div className="home-hero-panel" aria-label="ဝယ်ယူမှုလုပ်ငန်းစဉ်">
        <div className="panel-orbit" />
        <div className="hero-order-card">
          <div className="hero-order-head"><span>ORDER FLOW</span><StoreAvailability /></div>
          <h2>ဝယ်ယူမှု အဆင့် ၃ ဆင့်</h2>
          <ol><li><span>1</span><div><b>Product ရွေးချယ်ပါ</b><small>စည်းကမ်းနှင့် အာမခံကို စစ်ပါ</small></div></li><li><span>2</span><div><b>ငွေပေးချေမှု တင်ပါ</b><small>Screenshot နှင့် အချက်အလက်ဖြည့်ပါ</small></div></li><li><span>3</span><div><b>Delivery ရယူပါ</b><small>အတည်ပြုပြီးနောက် အကောင့်တွင်ကြည့်ပါ</small></div></li></ol>
          <Link href="/products">စတင်ရွေးချယ်ရန် <span>→</span></Link>
        </div>
        <div className="hero-mini-card top"><small>လက်ရှိရရှိနိုင်</small><b>{products.filter((p) => p.stock > 0).length} Products</b></div>
        <div className="hero-mini-card bottom"><span>ENI</span><div><small>Customer support</small><b>9 AM – 10 PM</b></div></div>
      </div>
    </section>

    <section className="home-notice"><div><span>သတိပြုရန်</span><p>Order မတင်မီ Product စည်းကမ်း၊ Stock နှင့် Warranty ကို သေချာဖတ်ပါ။ မရှင်းလင်းတာရှိရင် Support ကို အရင်မေးနိုင်ပါတယ်။</p></div><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">@independence_N ကိုမေးရန် ↗</a></section>

    <section className="home-section home-categories"><div className="home-section-head"><div><span>အမျိုးအစားအလိုက်</span><h2>လိုအပ်တာကို မြန်မြန်ရှာပါ</h2></div><Link href="/products">အားလုံးကြည့်ရန် →</Link></div><div className="home-category-grid">{categories.map((category) => <Link href={`/products?category=${category.id}`} className="home-category-card" key={category.id}><span>{category.icon}</span><div><b>{category.mm}</b><small>{category.label}</small></div><i>→</i></Link>)}</div></section>

    <section className="home-section home-featured"><div className="home-section-head"><div><span>ရွေးချယ်မှုများ</span><h2>လက်ရှိ လူရွေးများသော Products</h2><p>Stock နှင့် ဈေးနှုန်းကို မဝယ်ခင် ပြန်လည်စစ်ဆေးနိုင်ပါတယ်။</p></div><Link href="/products">Products အားလုံး →</Link></div><div className="product-grid">{featured.map((product) => <ProductCard product={product} key={product.id} />)}</div></section>

    <section className="home-trust"><div><span>ဘာကြောင့် ENI?</span><h2>မြန်တာထက် မှန်ကန်တာကို ဦးစားပေးပါတယ်။</h2><p>Digital product ဝယ်ယူရာမှာ သိထားသင့်တဲ့ အချက်အလက်ကို မဖုံးကွယ်ဘဲ order တစ်ခုချင်းစီကို အခြေအနေအလိုက် လိုက်ကြည့်နိုင်အောင် တည်ဆောက်ထားပါတယ်။</p><Link href="/orders" className="ghost-btn">Order tracking ကြည့်ရန်</Link></div><div className="trust-list"><article><span>01</span><div><h3>အရင်စစ်၊ ပြီးမှအတည်ပြု</h3><p>Payment proof ကို admin စစ်ပြီးမှ အော်ဒါအခြေအနေ ပြောင်းလဲပေးမည်။</p></div></article><article><span>02</span><div><h3>သက်ဆိုင်ရာအာမခံကို ဖော်ပြခြင်း</h3><p>Product တိုင်းအတွက် အာမခံရှိ/မရှိကို တစ်နေရာတည်းမှာ မြင်နိုင်သည်။</p></div></article><article><span>03</span><div><h3>ပြဿနာရှိရင် ဆက်သွယ်နိုင်ခြင်း</h3><p>သတ်မှတ်ထားသော support အချိန်အတွင်း Telegram မှ တိုက်ရိုက်မေးနိုင်သည်။</p></div></article></div></section>

    <section className="home-section home-faq" id="faq"><div className="home-faq-intro"><span>အကူအညီ</span><h2>မေးလေ့ရှိသော မေးခွန်းများ</h2><p>မဖြေရှင်းနိုင်သေးပါက Telegram Support မှာ အော်ဒါမတင်ခင် တိုက်ရိုက်မေးနိုင်ပါတယ်။</p><a href="https://t.me/independence_N" target="_blank" rel="noreferrer" className="gold-btn">@independence_N သို့ဆက်သွယ်ရန် ↗</a></div><div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div></section>
    <Footer />
  </main>;
}
