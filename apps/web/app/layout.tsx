import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Token Farmer',
  description: '种植像素模型花，收获并使用统一 Token Credit。',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          rel="preload"
          as="image"
          href="/assets/token-farm-background.webp"
          type="image/webp"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
