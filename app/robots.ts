import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://planora-plum-beta.vercel.app'


  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/plans/', '/friends', '/profile', '/groups'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
