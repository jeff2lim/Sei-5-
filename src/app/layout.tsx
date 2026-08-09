import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { StoreHydrator } from '@/components/common/store-hydrator';

const bodyFont = localFont({
  src: [
    {
      path: '../fonts/IBMPlexSansKR-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/IBMPlexSansKR-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/IBMPlexSansKR-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/IBMPlexSansKR-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-body',
  display: 'swap',
});

const titleFont = localFont({
  src: '../fonts/GowunDodum-Regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-title',
  display: 'swap',
});

const monoFont = localFont({
  src: [
    {
      path: '../fonts/IBMPlexMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/IBMPlexMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/IBMPlexMono-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
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
