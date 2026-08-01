import Link from "next/link";
import { categories, products } from "@/lib/catalog";
import "./premium-preview.css";

const featured = products.filter(product => product.popular).slice(0, 4);

export default function PremiumPreviewPage() {
  return <main className="pp-shell">
    <header className="pp-nav">
      <Link href="/premium-preview" className="pp-brand"><span>ENI</span><div><b>PREMIUM</b><small>DIGITAL MARKET</small></div></Link>
      <nav><a href="#collection">Collection</a><a href="#experience">Experience</a><a href="#assurance">Assurance</a></nav>
      <div className="pp-nav-actions"><Link href="/" className="pp-original">Original UI</Link><Link href="/products" className="pp-shop">Shop now <span>↗</span></Link></div>
    </header>

    <section className="pp-hero">
      <div className="pp-ambient pp-ambient-one"/><div className="pp-ambient pp-ambient-two"/>
      <div className="pp-hero-copy">
        <span className="pp-eyebrow"><i/> CURATED DIGITAL ESSENTIALS · MYANMAR</span>
        <h1>Digital products,<br/><em>elevated.</em></h1>
        <p>သင်လိုအပ်တဲ့ premium account နဲ့ digital service တွေကို ရှင်းလင်းတဲ့ဈေးနှုန်း၊ စစ်ဆေးထားတဲ့ payment flow နဲ့ ယုံကြည်စိတ်ချစွာ ရွေးချယ်ပါ။</p>
        <div className="pp-hero-actions"><Link href="/products" className="pp-primary">Explore collection <span>→</span></Link><Link href="/orders" className="pp-secondary">Track an order</Link></div>
        <div className="pp-proof"><div><b>4.9</b><span>★★★★★<small>Verified reviews</small></span></div><i/><div><b>9AM—10PM</b><span><small>Human support daily</small></span></div></div>
      </div>

      <div className="pp-showcase" aria-label="Premium product showcase">
        <div className="pp-rings"/>
        <article className="pp-feature-card">
          <header><span>ENI / 001</span><i>FEATURED</i></header>
          <div className="pp-feature-mark">E</div>
          <div className="pp-feature-meta"><span>PREMIUM ACCESS</span><h2>{featured[0]?.name || "Digital Premium"}</h2><p>{featured[0]?.description || "Curated access, delivered with care."}</p></div>
          <footer><div><small>FROM</small><b>{featured[0]?.price || "—"}</b></div><Link href={featured[0] ? `/products/${featured[0].id}` : "/products"}>View product <span>↗</span></Link></footer>
        </article>
        <div className="pp-float-card pp-float-top"><i>●</i><span><small>STORE STATUS</small><b>Online & accepting orders</b></span></div>
        <div className="pp-float-card pp-float-bottom"><span>✓</span><div><small>PAYMENT</small><b>Manually verified</b></div></div>
      </div>
    </section>

    <section className="pp-marquee"><div>AUTHENTIC ACCESS <i>◆</i> SECURE PAYMENT <i>◆</i> HUMAN SUPPORT <i>◆</i> CLEAR WARRANTY <i>◆</i> FAST DELIVERY <i>◆</i></div></section>

    <section className="pp-section pp-collections" id="collection">
      <div className="pp-section-head"><div><span>01 / COLLECTIONS</span><h2>Designed around<br/>what you need.</h2></div><p>နေ့စဉ်အသုံးပြုတဲ့ entertainment ကနေ professional tools အထိ စနစ်တကျရွေးချယ်ထားတဲ့ digital collection များ။</p></div>
      <div className="pp-category-grid">{categories.slice(0,6).map((category,index)=><Link href={`/products?category=${category.id}`} className="pp-category" key={category.id}><span>0{index+1}</span><div className="pp-category-icon">{category.icon}</div><h3>{category.mm}</h3><p>{category.label}</p><i>↗</i></Link>)}</div>
    </section>

    <section className="pp-section pp-products" id="experience">
      <div className="pp-section-head"><div><span>02 / EDITOR&apos;S SELECTION</span><h2>The current edit.</h2></div><Link href="/products">View all products <span>→</span></Link></div>
      <div className="pp-product-grid">{featured.map((product,index)=><article className="pp-product" key={product.id}>
        <div className={`pp-product-art pp-art-${index+1}`}><span>{product.icon}</span><small>0{index+1}</small>{product.popular&&<em>CURATED</em>}</div>
        <div className="pp-product-info"><span>{product.categoryLabel}</span><h3>{product.name}</h3><p>{product.description}</p><div><small>{product.stock>0?`${product.stock} in stock`:"Sold out"}</small><b>{product.price}</b></div><Link href={`/products/${product.id}`}>View details <span>↗</span></Link></div>
      </article>)}</div>
    </section>

    <section className="pp-assurance" id="assurance">
      <div className="pp-assurance-copy"><span>03 / THE ENI STANDARD</span><h2>Premium isn&apos;t a look.<br/><em>It&apos;s how you&apos;re treated.</em></h2><p>Order တင်တဲ့အချိန်ကနေ delivery ရရှိတဲ့အထိ တစ်ဆင့်ချင်းကြည့်နိုင်ပြီး မရှင်းလင်းတာရှိရင် လူကိုယ်တိုင် support ပေးထားပါတယ်။</p><Link href="/reviews">Customer stories <span>→</span></Link></div>
      <div className="pp-assurance-list"><article><span>01</span><div><h3>Transparent by default</h3><p>ဈေးနှုန်း၊ stock၊ delivery time နဲ့ warranty ကို မဝယ်ခင် ရှင်းရှင်းလင်းလင်းမြင်ရမယ်။</p></div></article><article><span>02</span><div><h3>Verified, not automated</h3><p>Payment proof တိုင်းကို admin က ကိုယ်တိုင်စစ်ဆေးပြီးမှ order ကိုအတည်ပြုပေးမယ်။</p></div></article><article><span>03</span><div><h3>Support that stays</h3><p>ပစ္စည်းရပြီးနောက် ပြဿနာရှိရင် warranty အခြေအနေအလိုက် တိုက်ရိုက်ကူညီပေးမယ်။</p></div></article></div>
    </section>

    <section className="pp-cta"><span>YOUR NEXT DIGITAL ESSENTIAL</span><h2>Ready when you are.</h2><p>ရိုးရှင်းတဲ့ရွေးချယ်မှု။ ရှင်းလင်းတဲ့အချက်အလက်။ ယုံကြည်ရတဲ့ဝန်ဆောင်မှု။</p><Link href="/products">Enter the collection <span>→</span></Link></section>

    <footer className="pp-footer"><Link href="/premium-preview" className="pp-brand"><span>ENI</span><div><b>PREMIUM</b><small>DIGITAL MARKET</small></div></Link><p>Premium digital essentials, thoughtfully delivered.</p><div><Link href="/">Original UI</Link><Link href="/products">Products</Link><Link href="/reviews">Reviews</Link><a href="https://t.me/independence_N" target="_blank" rel="noreferrer">Telegram ↗</a></div><small>© 2026 ENI Premium Store</small></footer>
  </main>;
}
