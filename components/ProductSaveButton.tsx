"use client";

import { useEffect, useState } from "react";

let savedIdsPromise: Promise<Set<number>> | null = null;

function getSavedIds(apiUrl: string, token: string) {
  if (!savedIdsPromise) savedIdsPromise = fetch(`${apiUrl}/api/v1/saved-products`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }).then(response => response.ok ? response.json() : []).then(items => new Set<number>((items.data || items).map((item: { id: number }) => item.id))).catch(() => new Set<number>());
  return savedIdsPromise;
}

export function ProductSaveButton({ productId, compact = false }: { productId: number; compact?: boolean }) {
  const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { const token=sessionStorage.getItem("eni_auth_token");if(!token)return;const apiUrl=(process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000").replace(/\/$/,"");void getSavedIds(apiUrl,token).then(ids=>setSaved(ids.has(productId))); }, [productId]);
  async function toggle(){const token=sessionStorage.getItem("eni_auth_token");if(!token){window.location.assign("/login");return;}const apiUrl=(process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000").replace(/\/$/,"");setBusy(true);try{const response=await fetch(`${apiUrl}/api/v1/products/${productId}/save`,{method:"POST",headers:{Accept:"application/json",Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error();const payload=await response.json();setSaved(Boolean(payload.saved));savedIdsPromise=null;window.dispatchEvent(new CustomEvent("eni:saved-products-changed"));}finally{setBusy(false);}}
  return <button type="button" className={`product-save-button${saved?" saved":""}${compact?" compact":""}`} onClick={toggle} disabled={busy} aria-label={saved?"သိမ်းထားသည်မှ ဖယ်ရန်":"Product သိမ်းရန်"} title={saved?"သိမ်းထားသည်မှ ဖယ်ရန်":"Product သိမ်းရန်"}><span>{saved?"♥":"♡"}</span>{!compact&&(saved?"သိမ်းထားပြီး":"သိမ်းထားရန်")}</button>;
}
