'use client';

import { ClipboardList, Home, Package, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/records', label: '기록', icon: ClipboardList },
  { href: '/products', label: '내 제품', icon: Package },
  { href: '/profile', label: '마이', icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="하단 탐색">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
