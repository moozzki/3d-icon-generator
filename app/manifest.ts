import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audora - AI 3D Isometric Icon Generator',
    short_name: 'Audora',
    description: 'Generate high-quality 3D isometric icons in seconds for your landing pages, apps, and Figma projects',
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/assets/audora-square-logo-192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/assets/audora-square-logo-512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  }
}
