import type { MetadataRoute } from "next";
import { getPublishedIssues, getRecentSlugs } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, issues] = await Promise.all([getRecentSlugs(200), getPublishedIssues()]);
  const pages = ["", "/articles", "/issues", "/about", "/for-authors", "/editorial-board"];
  return [
    ...pages.map((path) => ({ url: `${siteUrl}${path}` })),
    ...issues.map((i) => ({ url: `${siteUrl}/issues/${i.volume}/${i.number}` })),
    ...slugs.map((slug) => ({ url: `${siteUrl}/articles/${slug}` })),
  ];
}
