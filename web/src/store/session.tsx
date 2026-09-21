/**
 * Сессия: кто вошёл, в какой компании работает и какие документы создал.
 *
 * Сейчас это заглушка поверх мок-данных — настоящих входа и сервера ещё нет.
 * Два решения приняты уже здесь, чтобы потом не переделывать:
 *
 *  - компания хранится отдельно от пользователя и меняется явно; на сервере
 *    company_id будет браться только из токена, но и на сайте он не должен
 *    приходить из адреса страницы или из тела запроса;
 *  - созданные документы держатся в sessionStorage, а не в localStorage:
 *    содержимое документов не должно пережить закрытие вкладки. Настоящий
 *    access-токен вообще не покинет память (CLAUDE.md, п. 3.8).
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { companies, findCompany } from '@/api/mock/companies';

import type { Company, DocumentRecord, DocumentStatus } from '@/api/types';
import type { ReactNode } from 'react';

interface User {
  login: string;
  displayName: string;
  /** Компании, в которых у человека есть роли. */
  companyIds: string[];
}

interface SessionValue {
  user: User | null;
  company: Company | null;
  documents: DocumentRecord[];
  signIn: (login: string) => void;
  signOut: () => void;
  selectCompany: (companyId: string) => void;
  createDocument: (input: {
    templateId: string;
    title: string;
    values: Record<string, string>;
  }) => DocumentRecord;
  findDocument: (id: string) => DocumentRecord | undefined;
}

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = 'docflow.demo.session';

interface Persisted {
  user: User | null;
  companyId: string | null;
  documents: DocumentRecord[];
}

function readPersisted(): Persisted {
  const empty: Persisted = { user: null, companyId: null, documents: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    // Хранилище может быть недоступно: приватное окно, запрет на сайт,
    // переполнение. Это не повод не открыть страницу.
    return empty;
  }
}

function writePersisted(state: Persisted): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Не сохранилось — работаем в памяти до перезагрузки.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = readPersisted();

  const [user, setUser] = useState<User | null>(initial.user);
  const [companyId, setCompanyId] = useState<string | null>(initial.companyId);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initial.documents);

  const persist = useCallback((next: Partial<Persisted>) => {
    const current = readPersisted();
    writePersisted({ ...current, ...next });
  }, []);

  const signIn = useCallback(
    (login: string) => {
      // В демонстрации человек получает роли во всех четырёх компаниях,
      // чтобы был виден выбор компании и смена брендинга.
      const nextUser: User = {
        login,
        displayName: login.trim() || 'Пользователь',
        companyIds: companies.map((c) => c.id),
      };
      setUser(nextUser);
      persist({ user: nextUser });
    },
    [persist],
  );

  const signOut = useCallback(() => {
    setUser(null);
    setCompanyId(null);
    setDocuments([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Нечего чистить.
    }
  }, []);

  const selectCompany = useCallback(
    (id: string) => {
      setCompanyId(id);
      persist({ companyId: id });
    },
    [persist],
  );

  const createDocument = useCallback<SessionValue['createDocument']>(
    ({ templateId, title, values }) => {
      const record: DocumentRecord = {
        id: `d-${Date.now().toString(36)}`,
        templateId,
        companyId: companyId ?? '',
        title,
        // Новый документ всегда черновик: номер присваивается только при
        // утверждении, и до этого его нет (CLAUDE.md, п. 3.4).
        status: 'draft' satisfies DocumentStatus,
        number: null,
        createdAt: new Date().toISOString(),
        values,
        authorName: user?.displayName ?? '',
      };

      setDocuments((prev) => {
        const next = [record, ...prev];
        persist({ documents: next });
        return next;
      });

      return record;
    },
    [companyId, persist, user],
  );

  const value = useMemo<SessionValue>(
    () => ({
      user,
      company: companyId === null ? null : (findCompany(companyId) ?? null),
      documents,
      signIn,
      signOut,
      selectCompany,
      createDocument,
      findDocument: (id) => documents.find((d) => d.id === id),
    }),
    [user, companyId, documents, signIn, signOut, selectCompany, createDocument],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession вызван вне SessionProvider');
  }
  return value;
}
