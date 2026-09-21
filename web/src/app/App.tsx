import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { queryClient } from '@/api/queryClient';
import { AppRoutes } from '@/app/router';
import { SessionProvider, useSession } from '@/store/session';
import { CompanyTheme } from '@/theme/CompanyTheme';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <ThemeBridge />
          <AppRoutes />
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/** Отдельный компонент: тема берёт компанию из сессии, а не из пропсов. */
function ThemeBridge() {
  const { company } = useSession();
  return <CompanyTheme company={company} />;
}
