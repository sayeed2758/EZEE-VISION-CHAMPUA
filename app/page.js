import HomeClient from './home-client';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: 'EZEE VISION CHAMPUA | Quality Education. Personal Attention.',
    template: '%s | EZEE VISION CHAMPUA'
  },
  description: 'EZEE VISION CHAMPUA provides focused coaching for Classes 4–12 with concept-based learning, regular practice and personal attention in Champua, Odisha.',
  keywords: ['EZEE VISION CHAMPUA', 'coaching in Champua', 'coaching centre Champua', 'Classes 4 to 12 coaching', 'CBSE coaching Champua', 'education Champua Odisha'],
  applicationName: 'EZEE VISION CHAMPUA',
  creator: 'Shahid Sir',
  publisher: 'EZEE VISION CHAMPUA',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  ...(siteUrl ? { alternates: { canonical: '/' } } : {}),
  openGraph: { title: 'EZEE VISION CHAMPUA | Quality Education. Personal Attention.', description: 'Focused coaching for Classes 4–12 in Champua, Odisha.', type: 'website', locale: 'en_IN', siteName: 'EZEE VISION CHAMPUA' },
  twitter: { card: 'summary_large_image', title: 'EZEE VISION CHAMPUA', description: 'Focused coaching for Classes 4–12 in Champua, Odisha.' }
};

export default function Page() {
  return <HomeClient />;
}
