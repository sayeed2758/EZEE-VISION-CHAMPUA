export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
  return [{ url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }];
}
