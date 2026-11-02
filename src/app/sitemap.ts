import type { MetadataRoute } from "next";
import { getProfileHandles, getPublishedIssues, getRecentSlugs } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, issues, handles] = await Promise.all([
    getRecentSlugs(200),
    getPublishedIssues(),
    getProfileHandles(),
  ]);
  const pages = ["", "/articles", "/issues", "/about", "/for-authors", "/who-we-are"];
  return [
    ...pages.map((path) => ({ url: `${siteUrl}${path}` })),
    ...issues.map((i) => ({ url: `${siteUrl}/issues/${i.volume}/${i.number}` })),
    ...slugs.map((slug) => ({ url: `${siteUrl}/articles/${slug}` })),
    ...handles.map((handle) => ({ url: `${siteUrl}/people/${handle}` })),
  ];
}
