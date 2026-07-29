import { BottomNav } from '@/components/navigation/bottom-nav';
import { DraftBanner } from '@/components/common/draft-banner';

export function AppShell({
  children,
  navigation = true,
}: {
  children: React.ReactNode;
  navigation?: boolean;
}) {
  return (
    <>
      <main className={`app-main${navigation ? '' : ' no-nav'}`}>
        <DraftBanner />
        {children}
      </main>
      {navigation ? <BottomNav /> : null}
    </>
  );
}
