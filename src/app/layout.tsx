import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snowball',
  description: 'Viral referral & giveaway campaigns, self-hosted. A from-scratch, better Upviral alternative.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
