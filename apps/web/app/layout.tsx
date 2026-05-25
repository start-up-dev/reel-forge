import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aireelforge.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ReelForge — Automatic Facebook Video Maker for Small Business",
    template: "%s | ReelForge",
  },
  description:
    "Generate a full week of Facebook videos in one click. We write the scripts, produce the clips, review every video, and auto-post to your Facebook page. Try your first week for $5.",
  keywords: [
    "facebook video maker for small business",
    "automatic facebook video scheduler",
    "AI video generator for facebook business page",
    "weekly facebook content creator tool",
    "facebook video automation software",
    "automated Facebook videos",
    "facebook video automation",
    "faceless facebook video creator",
    "automate facebook business page posts",
    "ReelForge",
  ],
  authors: [{ name: "Make Real", url: "https://makereal.io" }],
  creator: "Make Real",
  publisher: "ReelForge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "ReelForge",
    title: "ReelForge — Automatic Facebook Video Maker for Small Business",
    description:
      "Generate a full week of Facebook videos in one click. We write the scripts, produce the clips, review every video, and auto-post to your Facebook page.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReelForge — Automatic Facebook Video Maker for Small Business",
    description:
      "Generate a full week of Facebook videos in one click. Scripts written, clips produced, human-reviewed, auto-posted. Try for $5.",
    creator: "@reelforge",
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to R2 CDN so video requests start sooner once in viewport */}
        <link
          rel="preconnect"
          href="https://pub-425a4c402193444fb20eeb6725aa6557.r2.dev"
        />
        <link
          rel="dns-prefetch"
          href="https://pub-425a4c402193444fb20eeb6725aa6557.r2.dev"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        {children}
      </body>
      {/* lazyOnload — analytics must never block rendering */}
      <Script
        src="https://scripts.simpleanalyticscdn.com/latest.js"
        strategy="lazyOnload"
      />
    </html>
  );
}
