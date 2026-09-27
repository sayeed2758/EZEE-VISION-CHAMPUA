import './globals.css';

export const metadata = {
  title: 'EZEE VISION CHAMPUA | Classes 4–12',
  description:
    'EZEE VISION CHAMPUA — a student-focused coaching institute for Classes 4 to 12 with concept-based learning, regular practice and personal attention.',
  keywords: [
    'EZEE VISION CHAMPUA',
    'Ezee Vision Champua',
    'coaching in Champua',
    'classes 4 to 12',
    'student focused coaching'
  ],
  openGraph: {
    title: 'EZEE VISION CHAMPUA',
    description: 'Quality Education. Personal Attention. Better Learning.',
    type: 'website'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
