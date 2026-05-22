import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Clock } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aireelforge.com";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and tutorials on automating your Facebook video content — for small business owners, creators, and faceless brands.",
  alternates: {
    canonical: `${APP_URL}/blog`,
  },
};

const posts = [
  {
    slug: "how-to-create-facebook-videos-automatically",
    title:
      "How to Create a Week of Facebook Videos Automatically (Without Filming Anything)",
    description:
      "Step-by-step guide to automating your Facebook video content — no camera, no editing app, no daily production grind.",
    date: "May 22, 2026",
    readTime: "6 min read",
    tag: "Guide",
  },
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#F4F4F8]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] font-bold text-[#a1a1aa] hover:text-[#F4F4F8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ReelForge
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f55c2a] px-4 py-2 text-[12px] font-bold text-white hover:brightness-110 transition-all"
          >
            Start for $5
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <header className="mb-12 md:mb-16">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f55c2a]">
            ReelForge Blog
          </p>
          <h1 className="text-[32px] sm:text-[36px] font-[900] leading-tight tracking-[-0.03em] text-[#F4F4F8]">
            Guides for Facebook video automation
          </h1>
          <p className="mt-4 text-[16px] md:text-[18px] leading-relaxed text-[#a1a1aa]">
            Practical guides for small business owners, creators, and faceless
            brands who want to stay active on Facebook without the daily
            production grind.
          </p>
        </header>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full border border-[#f55c2a]/30 bg-[#f55c2a]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#f55c2a]">
                  {post.tag}
                </span>
                <div className="flex items-center gap-1.5 text-[12px] text-[#52525b]">
                  <Clock className="w-3 h-3" />
                  <span>
                    {post.date} · {post.readTime}
                  </span>
                </div>
              </div>
              <h2 className="mb-3 text-[18px] md:text-[20px] font-[900] leading-snug tracking-tight text-[#F4F4F8] group-hover:text-[#f55c2a] transition-colors">
                {post.title}
              </h2>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-[#a1a1aa]">
                {post.description}
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[12px] font-bold text-[#f55c2a]">
                Read guide
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <Link
            href="/"
            className="text-[13px] font-bold text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            ← Back to ReelForge
          </Link>
        </div>
      </main>
    </div>
  );
}
