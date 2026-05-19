import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://aireelforge.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/brands/",
          "/channels/",
          "/library/",
          "/billing/",
          "/settings/",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
