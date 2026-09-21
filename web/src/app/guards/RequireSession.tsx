/**
 * Стражи маршрутов.
 *
 * Сайт ничего не решает: это только удобство навигации, защита остаётся на
 * сервере (CLAUDE.md, п. 3.3). Здесь мы лишь не показываем экран, который
 * без входа или без выбранной компании всё равно пуст.
 */
import { Navigate, useLocation } from 'react-router-dom';

import { useSession } from '@/store/session';

import type { ReactNode } from 'react';

export function RequireSession({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();

  if (user === null) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireCompany({ children }: { children: ReactNode }) {
  const { company } = useSession();

  if (company === null) {
    return <Navigate to="/choose-company" replace />;
  }
  return <>{children}</>;
}
