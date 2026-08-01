import { products as productDesigns, type Product } from "@/lib/catalog";

export type ApiProduct = {
  id: number;
  name: string;
  price: string | number;
  stock: number;
  description: string;
  purchase_note?: string | null;
  warranty_type: string;
  delivery_time: string;
  is_featured: boolean;
  category?: { name: string; slug: string };
  related_products?: ApiProduct[];
};

const warrantyLabels: Record<string, string> = {
  full: "အပြည့်အဝအာမခံ",
  standard: "ပုံမှန်အာမခံ",
  none: "အာမခံမရှိ",
};

export function toCatalogProduct(item: ApiProduct): Product {
  const design = productDesigns.find((product) => product.id === item.id);
  return {
    id: item.id,
    name: item.name,
    category: item.category?.slug || "services",
    categoryLabel: item.category?.name || "Digital Services",
    price: `${Number(item.price).toLocaleString()} ကျပ်`,
    stock: Number(item.stock),
    warranty: warrantyLabels[item.warranty_type] || item.warranty_type,
    delivery: item.delivery_time,
    icon: design?.icon || item.name.slice(0, 2).toUpperCase(),
    accent: design?.accent || "ink",
    description: item.description,
    purchaseNote: item.purchase_note || null,
    popular: Boolean(item.is_featured),
  };
}
