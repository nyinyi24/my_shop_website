import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { ProductSaveButton } from "@/components/ProductSaveButton";

export function ProductCard({ product }: { product: Product }) {
  const warrantyClass = product.warranty === "အပြည့်အဝအာမခံ" ? "full" : product.warranty === "အာမခံမရှိ" ? "none" : "standard";
  const stockText = product.stock === 0 ? "လက်ရှိ Stock မရှိပါ" : product.stock <= 2 ? `Stock ${product.stock} ခုသာ ကျန်သည်` : `Stock ${product.stock} ခု ရရှိနိုင်သည်`;

  return <article className="product-card">
    <div className="product-top"><span className={`product-logo ${product.accent}`}>{product.icon}</span><div className="product-card-tools"><span className={`warranty ${warrantyClass}`}>{product.warranty}</span><ProductSaveButton productId={product.id} compact /></div></div>
    <span className="product-category">{product.categoryLabel}</span>
    <h3>{product.name}</h3><p>{product.description}</p>
    <div className={`stock ${product.stock === 0 ? "out" : product.stock <= 2 ? "low" : "in"}`}><i />{stockText}</div>
    <div className="delivery"><span aria-hidden="true">↗</span>{product.delivery}</div>
    <div className="product-price"><span>လက်ရှိဈေးနှုန်း</span><b>{product.price}</b></div>
    <Link className="card-action" href={`/products/${product.id}`}>အသေးစိတ်ကြည့်ရန် <span>→</span></Link>
  </article>;
}
