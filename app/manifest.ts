import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audora',
    short_name: 'Audora',
    description: 'Generate high-quality 3D isometric icons in seconds for your landing pages, apps, and Figma projects',
    start_url: '/sign-in',
    scope: '/',
    id: '/sign-in',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    prefer_related_applications: false,
    categories: ['graphics', 'productivity', 'utilities'],
    icons: [
      {
        src: '/assets/audora-square-logo-withbg-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
      {
        src: '/assets/audora-square-logo-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
    ],
  }
}
