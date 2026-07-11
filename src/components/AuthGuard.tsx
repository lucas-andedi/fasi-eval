'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { getAccessToken } from '@/lib/api';
import { homeFor } from '@/lib/rbac';
import type { Role } from '@/lib/types';
import { Logo } from '@/components/Logo';

/** Espaces autorisés pour un compte juré seul. */
const JURY_AREAS = ['/jury', '/president', '/compte'];
function isJuryAreaPath(pathname: string): boolean {
  return JURY_AREAS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** Protège les routes et vérifie le rôle. */
export function AuthGuard({ children, allow }: { children: React.ReactNode; allow?: Role[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    if (!user && getAccessToken()) refresh();
    else if (!getAccessToken()) useAuth.setState({ loading: false });
  }, [user, refresh]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.mustChangePassword) {
      router.replace('/compte/mot-de-passe?first=1');
      return;
    }
    if (allow && !allow.some((r) => user.roles.includes(r))) {
      router.replace(homeFor(user.roles));
      return;
    }
    // Confinement : un compte JURY seul (ni COMMISSION ni ADMIN) reste dans son espace.
    const juryOnly = !user.roles.includes('COMMISSION') && !user.roles.includes('ADMIN');
    if (juryOnly && pathname && !isJuryAreaPath(pathname)) {
      router.replace('/jury');
    }
  }, [user, loading, allow, router, pathname]);

  if (loading || !user || (allow && !allow.some((r) => user.roles.includes(r)))) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-float"><Logo size={56} /></div>
          <p className="text-sm font-medium text-ink/40">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
