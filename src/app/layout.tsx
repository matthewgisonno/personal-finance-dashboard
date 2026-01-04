import { Manrope } from 'next/font/google';

import type { Metadata } from 'next';

import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'FinanceFlow - Personal Finance Dashboard',
  description: 'Track, categorize, and analyze your spending with AI'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased font-sans`}>{children}</body>
    </html>
  );
}
