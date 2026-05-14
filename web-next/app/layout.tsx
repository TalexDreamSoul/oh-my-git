import './styles/game.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oh My Git! Web',
  description: 'Learn Git in the browser'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
