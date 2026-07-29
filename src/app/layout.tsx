import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Gowun_Dodum, IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import { StoreHydrator } from '@/components/common/store-hydrator';

const bodyFont = IBM_Plex_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});
const titleFont = Gowun_Dodum({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-title',
  display: 'swap',
});
const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: '회복노트', template: '%s · 회복노트' },
  description: '피코토닝 후 날짜별 제품 사용 안내를 확인하는 회복 관리 노트',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  openGraph: {
    title: '회복노트',
    description: '내 제품으로 확인하는 오늘의 회복 안내',
    type: 'website',
    locale: 'ko_KR',
  },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F6F7F5',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${bodyFont.variable} ${titleFont.variable} ${monoFont.variable}`}>
      <body>
        <StoreHydrator />
        <div className="viewport">{children}</div>
      </body>
    </html>
  );
}
