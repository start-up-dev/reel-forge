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

export const metadata: Metadata = {
  title: "ReelForge — AI Video Creator",
  description:
    "Create viral short-form videos for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels in minutes with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
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
