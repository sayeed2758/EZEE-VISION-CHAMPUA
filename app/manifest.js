export default function manifest() {
  return {
    id: '/',
    name: 'EZEE VISION CHAMPUA',
    short_name: 'EZEE VISION',
    description: 'Quality Education. Personal Attention. Better Learning.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#083b8c',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  };
}
