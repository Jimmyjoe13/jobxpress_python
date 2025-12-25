import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://rocket-jobxpress.netlify.app'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/auth/', '/login', '/register'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
