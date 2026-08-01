export type Product = {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  price: string;
  stock: number;
  warranty: string;
  delivery: string;
  icon: string;
  accent: string;
  description: string;
  purchaseNote?: string | null;
  popular?: boolean;
};

export const products: Product[] = [
  { id: 1, name: "Gemini Pro 18 Months", category: "ai", categoryLabel: "AI Tools", price: "8,000 ကျပ်", stock: 20, warranty: "အာမခံမရှိ", delivery: "ငွေပေးချေမှုစစ်ပြီးနောက် ပို့ပေးမည်", icon: "Ge", accent: "blue", description: "Gemini Pro အသုံးပြုခွင့်နှင့် 5 TB storage ပါဝင်သော plan။ ဝယ်ယူမီ စည်းကမ်းချက်ကို စစ်ဆေးပါ။", popular: true },
  { id: 2, name: "SuperGrok 12 Months", category: "ai", categoryLabel: "AI Tools", price: "25,000 ကျပ်", stock: 7, warranty: "အာမခံမရှိ", delivery: "ခန့်မှန်း 15–30 မိနစ်", icon: "G", accent: "ink", description: "တစ်နှစ်စာ SuperGrok access။ Account အမျိုးအစားနှင့် အသုံးပြုမှုစည်းကမ်းကို order မတင်မီ မေးမြန်းနိုင်သည်။", popular: true },
  { id: 3, name: "SuperGrok Full Warranty", category: "ai", categoryLabel: "AI Tools", price: "130,000 ကျပ်", stock: 5, warranty: "အပြည့်အဝအာမခံ", delivery: "ခန့်မှန်း 15–30 မိနစ်", icon: "G+", accent: "violet", description: "သတ်မှတ်ကာလအတွင်း replacement support ပါဝင်သော SuperGrok plan။ အာမခံစည်းကမ်း သက်ဆိုင်သည်။" },
  { id: 4, name: "Outline VPN SG Key", category: "vpn", categoryLabel: "VPN Services", price: "3,000 ကျပ်", stock: 9, warranty: "ပုံမှန်အာမခံ", delivery: "ငွေပေးချေမှုစစ်ပြီးနောက် ပို့ပေးမည်", icon: "SG", accent: "red", description: "Singapore server နှင့် 100 GB data ပါဝင်သော Outline access key။", popular: true },
  { id: 5, name: "Outline VPN Unlimited", category: "vpn", categoryLabel: "VPN Services", price: "5,000 ကျပ်", stock: 2, warranty: "ပုံမှန်အာမခံ", delivery: "ငွေပေးချေမှုစစ်ပြီးနောက် ပို့ပေးမည်", icon: "∞", accent: "coral", description: "သတ်မှတ်ကာလအတွင်း data limit မထားသော Singapore VPN key။ Fair-use policy သက်ဆိုင်နိုင်သည်။" },
  { id: 6, name: "CapCut Pro Team", category: "apps", categoryLabel: "Mobile Apps", price: "10,000 ကျပ်", stock: 10, warranty: "အပြည့်အဝအာမခံ", delivery: "ခန့်မှန်း 30 မိနစ်", icon: "CC", accent: "ink", description: "CapCut Pro Team တစ်လစာ access။ စတင်သည့်နေ့နှင့် ကုန်ဆုံးရက်ကို delivery အချိန်တွင် ဖော်ပြပေးမည်။", popular: true },
  { id: 7, name: "ChatGPT Plus", category: "ai", categoryLabel: "AI Tools", price: "40,000 ကျပ်", stock: 0, warranty: "ပုံမှန်အာမခံ", delivery: "လက်ရှိ ဝယ်ယူ၍မရသေးပါ", icon: "GPT", accent: "green", description: "ChatGPT Plus တစ်လစာ plan။ Stock ပြန်ရောက်ချိန်တွင်သာ order တင်နိုင်မည်။" },
  { id: 8, name: "Coursera 12 Months", category: "services", categoryLabel: "Digital Services", price: "80,000 ကျပ်", stock: 1, warranty: "အပြည့်အဝအာမခံ", delivery: "ခန့်မှန်း 1 နာရီ", icon: "C", accent: "blue", description: "Coursera 12 လ အသုံးပြုခွင့်နှင့် setup အကူအညီပါဝင်သော service။" },
];

export const categories = [
  { id: "ai", label: "AI Tools", mm: "AI ကိရိယာများ", icon: "AI" },
  { id: "vpn", label: "VPN Services", mm: "VPN ဝန်ဆောင်မှု", icon: "VPN" },
  { id: "apps", label: "Mobile Apps", mm: "မိုဘိုင်း App များ", icon: "APP" },
  { id: "streaming", label: "Streaming", mm: "ရုပ်ရှင်နှင့် စီးရီး", icon: "TV" },
  { id: "music", label: "Music Premium", mm: "ဂီတဝန်ဆောင်မှု", icon: "♪" },
  { id: "games", label: "Games", mm: "ဂိမ်းနှင့် Items", icon: "GAME" },
  { id: "services", label: "Digital Services", mm: "အထူးဝန်ဆောင်မှု", icon: "PRO" },
];
