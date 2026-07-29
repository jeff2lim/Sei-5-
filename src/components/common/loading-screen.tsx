import { AppShell } from '@/components/app-shell/app-shell';

export function LoadingScreen({ navigation = true }: { navigation?: boolean }) {
  return (
    <AppShell navigation={navigation}>
      <p className="sr-only" role="status">
        불러오는 중
      </p>
      <div className="stack" aria-hidden="true">
        <div className="skeleton" style={{ minHeight: 160 }} />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </AppShell>
  );
}
