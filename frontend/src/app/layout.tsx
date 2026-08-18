import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SITE_URL } from "@/lib/seo/services";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gymholic — Gym Consulting for Egypt, UAE & the GCC",
    template: "%s | Gymholic",
  },
  description:
    "Gymholic turns underperforming gyms into retention machines. Gym business consulting across Egypt, the UAE, the GCC, and worldwide",
  openGraph: {
    siteName: "Gymholic",
    type: "website",
    url: SITE_URL,
    title: "Gymholic — Gym Consulting for Egypt, UAE & the GCC",
    description:
      "Gym business consulting that moves the numbers: retention, revenue, operations and setup. Egypt, UAE, GCC & worldwide.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gymholic — Gym Consulting",
    description:
      "Gym business consulting that moves the numbers: retention, revenue, operations and setup.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Aeonik is a paid CoType Foundry font with no legitimate free CDN
            source — General Sans is the standard free substitute (same
            geometric neo-grotesk family) and now drives both display and
            body type. */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" />
        <link rel="icon" href="/gymholic-logo.png" />
      </head>
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
