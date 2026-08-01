import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./home.css";
import "./products.css";
import "./checkout.css";
import "./auth.css";
import "./dashboard.css";
import "./orders.css";
import "./reviews.css";
import "./announcements.css";
import "./typography.css";
import "./admin-console.css";
import "./admin-adjustments.css";
import "./admin-responsive.css";
import "./store-availability.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ENI Premium Store | Myanmar Digital Marketplace",
  description: "AI Tools, VPN, Streaming နှင့် Premium Digital Services များကို လုံခြုံလွယ်ကူစွာ ဝယ်ယူနိုင်သော ENI Premium Store။",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="my" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("eni-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var raw=localStorage.getItem("eni_remembered_auth");if(raw){var auth=JSON.parse(raw);if(auth.token&&auth.expiresAt>Date.now())sessionStorage.setItem("eni_auth_token",auth.token);else localStorage.removeItem("eni_remembered_auth")}}catch(e){document.documentElement.dataset.theme="dark";localStorage.removeItem("eni_remembered_auth")}})();` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
