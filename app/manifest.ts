import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zupericon',
    short_name: 'Zupericon',
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
        src: '/assets/zupericon-logo-square-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/zupericon-logo-square-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/zupericon-logo-square-withbg-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
