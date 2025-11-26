import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Personal Finance App',
  description: 'Track your expenses and budget',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

