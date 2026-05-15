import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WilsonBlackjack",
  description: "Vegas-style blackjack",
  other: {
    "google-adsense-account": "ca-pub-6467256840152370",
  },
};

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
      <Analytics />
      {ADSENSE_CLIENT && (
        <>
          {/* Google H5 Games Ads — loads AdSense and wires up adBreak/adConfig */}
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
          <Script id="adsense-init" strategy="afterInteractive">
            {`
              window.adBreak = window.adConfig = function(o) {
                (window.adsbygoogle = window.adsbygoogle || []).push(o);
              };
              adConfig({ preloadAdBreaks: "on", sound: "on" });
            `}
          </Script>
        </>
      )}
    </html>
  );
}
