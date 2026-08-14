import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";

export const metadata: Metadata = {
  title: "Gymholic — Gym Consulting for Egypt, UAE & the GCC",
  description:
    "Gymholic turns underperforming gyms into retention machines. Gym business consulting across Egypt, the UAE, the GCC, and worldwide.",
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
