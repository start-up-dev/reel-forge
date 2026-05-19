import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

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
    default: "ReelForge — AI Short-Form Video Content Machine",
    template: "%s | ReelForge",
  },
  description:
    "Plan a full week of short-form videos in 10 minutes. ReelForge writes every script, generates every AI video, and auto-posts to Facebook, TikTok, and Instagram — while you sleep. Try a full week for $5.",
  keywords: [
    "AI video creator",
    "automated Facebook videos",
    "AI content creator",
    "short-form video automation",
    "AI video generator",
    "Facebook Reels automation",
    "weekly content planner AI",
    "TikTok video automation",
    "social media content machine",
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
    title: "ReelForge — AI Short-Form Video Content Machine",
    description:
      "Plan a full week of short-form videos in 10 minutes. ReelForge writes every script, generates every AI video, and auto-posts to Facebook, TikTok, and Instagram — while you sleep.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReelForge — AI Short-Form Video Content Machine",
    description:
      "Plan a full week of short-form videos in 10 minutes. AI writes scripts, generates videos, auto-posts. Try a full week for $5.",
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#f55c2a",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}
        >
          {children}
        </body>
        <Script src="https://scripts.simpleanalyticscdn.com/latest.js" />
      </html>
    </ClerkProvider>
  );
}
