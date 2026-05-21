import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://aireelforge.com";

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: new Date("2026-05-22"),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/blog/how-to-create-facebook-videos-automatically`,
      lastModified: new Date("2026-05-22"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
