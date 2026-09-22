import { QueryClientProvider } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { queryClient } from '@/api/queryClient';
import { AppRoutes } from '@/app/router';
import { readLanguage, setLanguage } from '@/i18n';
import { SessionProvider, useSession } from '@/store/session';
import { CompanyTheme } from '@/theme/CompanyTheme';

import type { Lang } from '@/i18n';
import type { ReactNode } from 'react';

interface LanguageValue {
  lang: Lang;
  switchTo: (next: Lang) => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (value === null) throw new Error('useLanguage вызван вне App');
  return value;
}

export function App() {
  const [lang, setLang] = useState<Lang>(readLanguage);

  const switchTo = useCallback((next: Lang) => {
    // Словарь подменяется до перерисовки: компоненты читают `t` во время
    // отрисовки, и к моменту следующего прохода он уже новый.
    setLanguage(next);
    setLang(next);
  }, []);

  const language = useMemo<LanguageValue>(() => ({ lang, switchTo }), [lang, switchTo]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageContext.Provider value={language}>
        <SessionProvider>
          <BrowserRouter>
            <ThemeBridge />
            {/* Ключ по языку: смена языка перерисовывает дерево целиком,
                поэтому ни один экран не держит строки в состоянии. */}
            <LanguageBoundary lang={lang}>
              <AppRoutes />
            </LanguageBoundary>
          </BrowserRouter>
        </SessionProvider>
      </LanguageContext.Provider>
    </QueryClientProvider>
  );
}

function LanguageBoundary({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <div key={lang} className="languageRoot">{children}</div>;
}

/** Отдельный компонент: тема берёт компанию из сессии, а не из пропсов. */
function ThemeBridge() {
  const { company } = useSession();
  return <CompanyTheme company={company} />;
}
