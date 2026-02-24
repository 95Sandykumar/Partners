import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POFlow',
    short_name: 'POFlow',
    description: 'AI-Powered Purchase Order Management',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#007AFF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
