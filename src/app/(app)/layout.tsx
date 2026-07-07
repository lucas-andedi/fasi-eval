'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useAuth } from '@/lib/auth-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user)!;
  return <AppShell user={user}>{children}</AppShell>;
}
