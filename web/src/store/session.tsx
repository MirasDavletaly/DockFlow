/**
 * Сессия: кто вошёл, в какой компании работает и что ему видно.
 *
 * Два разделения сделаны здесь и дальше не меняются:
 *
 *  - кто вошёл, держится в `sessionStorage` вкладки, а данные — в
 *    `localStorage`. Закрыл вкладку — вышел, но черновики остались;
 *  - компания хранится отдельно от пользователя и меняется явно. На сервере
 *    `company_id` будет браться только из токена, и на сайте он тоже не
 *    приходит ни из адреса страницы, ни из тела запроса.
 *
 * Всё, что относится к правам, вынесено в `@/access/policy`: здесь только
 * чтение и запись, решает политика.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { canUseCompany, visibleDocuments } from '@/access/policy';
import {
  appendAudit,
  employeesOf,
  findCompanyIn,
  findEmployeeIn,
  loadDb,
  newId,
  publicUser,
  subscribeDb,
  updateDb,
} from '@/store/db';
import { hashPassword, verifyPassword } from '@/store/password';

import type {
  AuditEntry,
  Company,
  DocumentRecord,
  EmployeeBrief,
  PlatformSettings,
  RoleId,
  User,
} from '@/api/types';
import type { Database, StoredUser } from '@/store/db';
import type { ReactNode } from 'react';

/** Сколько неудачных попыток подряд закрывают вход и на сколько (CLAUDE.md, п. 3.8). */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type SignInResult = 'ok' | 'failed' | 'locked';

/**
 * Что человек правит в своём профиле.
 *
 * Логина, роли, компаний и разделов здесь нет намеренно: их выдаёт
 * администратор, и человек не должен уметь расширить себе доступ.
 * `avatar: undefined` означает «убрать фотографию».
 */
export interface ProfilePatch {
  displayName?: string;
  position?: string;
  phone?: string;
  email?: string;
  avatar?: string | undefined;
}

export interface NewUserInput {
  login: string;
  displayName: string;
  password: string;
  role: RoleId;
  companyIds: string[];
  sectionIds: string[];
  position?: string;
  email?: string;
  phone?: string;
}

export interface SaveDocumentInput {
  /** Есть — правим существующую запись, нет — заводим новую. */
  id?: string;
  templateId: string;
  title: string;
  number: string;
  description: string;
  subject: string;
  values: Record<string, string>;
  /** Черновик или сохранённый документ. */
  status: DocumentRecord['status'];
}

interface SessionValue {
  user: User | null;
  company: Company | null;
  /** Компании, доступные этому человеку. */
  companies: Company[];
  /** Документы, которые человеку видны в текущей компании. */
  documents: DocumentRecord[];
  /** Все видимые документы во всех доступных компаниях: только для админ-панели. */
  allVisibleDocuments: DocumentRecord[];
  /** Люди текущей компании: список выбора в формах. */
  employees: EmployeeBrief[];
  /** Справочники всех компаний: нужны только админ-панели. */
  allEmployees: EmployeeBrief[];
  users: User[];
  audit: AuditEntry[];
  settings: PlatformSettings;
  firstRun: boolean;

  createFirstAdmin: (input: {
    login: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  signIn: (login: string, password: string) => Promise<SignInResult>;
  signOut: () => void;
  /** Повторная проверка пароля: вход в админ-панель (CLAUDE.md, п. 3.8). */
  confirmPassword: (password: string) => Promise<boolean>;
  selectCompany: (companyId: string) => void;

  saveDocument: (input: SaveDocumentInput) => DocumentRecord;
  deleteDocument: (id: string) => void;
  findDocument: (id: string) => DocumentRecord | undefined;

  updateProfile: (patch: ProfilePatch) => void;
  changePassword: (current: string, next: string) => Promise<boolean>;

  createUser: (input: NewUserInput) => Promise<{ ok: boolean; reason?: 'login-taken' }>;
  updateUser: (id: string, patch: Partial<User>) => void;
  setUserPassword: (id: string, password: string) => Promise<void>;
  removeUser: (id: string) => void;

  saveCompany: (company: Company) => void;
  removeCompany: (id: string) => void;

  saveEmployee: (employee: EmployeeBrief) => void;
  removeEmployee: (id: string) => void;

  saveSettings: (settings: PlatformSettings) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const SESSION_KEY = 'docflow.session';

interface Persisted {
  userId: string | null;
  companyId: string | null;
}

function readSession(): Persisted {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw === null) return { userId: null, companyId: null };
    return { userId: null, companyId: null, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    return { userId: null, companyId: null };
  }
}

function writeSession(state: Persisted): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Работаем в памяти до перезагрузки.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const db = useSyncExternalStore(subscribeDb, loadDb);

  const initial = readSession();
  const [userId, setUserId] = useState<string | null>(initial.userId);
  const [companyId, setCompanyId] = useState<string | null>(initial.companyId);

  const stored = useMemo<StoredUser | null>(
    () => (userId === null ? null : (db.users.find((u) => u.id === userId) ?? null)),
    [db.users, userId],
  );
  const user = useMemo(() => (stored === null ? null : publicUser(stored)), [stored]);

  const persist = useCallback((next: Partial<Persisted>) => {
    writeSession({ ...readSession(), ...next });
  }, []);

  const createFirstAdmin = useCallback<SessionValue['createFirstAdmin']>(
    async ({ login, displayName, password }) => {
      const password_ = await hashPassword(password);
      const id = newId('u');

      updateDb((current) =>
        appendAudit(
          {
            ...current,
            users: [
              {
                id,
                login: login.trim(),
                displayName: displayName.trim(),
                role: 'platform-admin',
                companyIds: [],
                sectionIds: [],
                createdAt: new Date().toISOString(),
                password: password_,
                failedAttempts: 0,
              },
            ],
          },
          {
            userId: id,
            userName: displayName.trim(),
            companyId: '',
            event: 'user.create',
            target: login.trim(),
          },
        ),
      );
    },
    [],
  );

  const signIn = useCallback<SessionValue['signIn']>(async (login, password) => {
    const current = loadDb();
    const candidate = current.users.find(
      (u) => u.login.toLowerCase() === login.trim().toLowerCase(),
    );

    // Ответ одинаковый и когда логина нет, и когда пароль не подошёл: иначе
    // по разнице ответов перебирают логины (CLAUDE.md, п. 3.8).
    if (candidate === undefined) return 'failed';

    if (candidate.lockedUntil !== undefined && Date.parse(candidate.lockedUntil) > Date.now()) {
      return 'locked';
    }
    if (candidate.blocked === true) return 'failed';

    const ok = await verifyPassword(password, candidate.password);

    if (!ok) {
      const failed = candidate.failedAttempts + 1;
      const locked =
        failed >= MAX_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : undefined;

      updateDb((cur) => ({
        ...cur,
        users: cur.users.map((u) =>
          u.id === candidate.id
            ? { ...u, failedAttempts: failed, ...(locked === undefined ? {} : { lockedUntil: locked }) }
            : u,
        ),
      }));

      return locked === undefined ? 'failed' : 'locked';
    }

    updateDb((cur) =>
      appendAudit(
        {
          ...cur,
          users: cur.users.map((u) => (u.id === candidate.id ? unlock(u) : u)),
        },
        {
          userId: candidate.id,
          userName: candidate.displayName,
          companyId: '',
          event: 'auth.signin',
          target: candidate.login,
        },
      ),
    );

    setUserId(candidate.id);

    // Человеку с одной компанией выбирать не из чего — входим сразу в неё.
    const only =
      candidate.role === 'platform-admin' || candidate.companyIds.length !== 1
        ? null
        : (candidate.companyIds[0] ?? null);

    setCompanyId(only);
    persist({ userId: candidate.id, companyId: only });
    return 'ok';
  }, [persist]);

  const signOut = useCallback(() => {
    setUserId(null);
    setCompanyId(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Нечего чистить.
    }
  }, []);

  const confirmPassword = useCallback<SessionValue['confirmPassword']>(
    async (password) => {
      if (stored === null) return false;
      return verifyPassword(password, stored.password);
    },
    [stored],
  );

  const selectCompany = useCallback(
    (id: string) => {
      const next = id === '' ? null : id;
      setCompanyId(next);
      persist({ companyId: next });
    },
    [persist],
  );

  const subject = useMemo(() => ({ user, companyId }), [user, companyId]);

  const companies = useMemo(() => {
    if (user === null) return [];
    return db.companies.filter((c) => canUseCompany(user, c.id));
  }, [db.companies, user]);

  const documents = useMemo(() => {
    if (companyId === null) return [];
    return visibleDocuments(
      subject,
      db.documents.filter((d) => d.companyId === companyId),
    ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [db.documents, companyId, subject]);

  const allVisibleDocuments = useMemo(
    () =>
      visibleDocuments(subject, db.documents).sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [db.documents, subject],
  );

  const employees = useMemo(
    () => (companyId === null ? [] : employeesOf(companyId)),
    // db.employees в зависимостях нарочно: справочник правится в админ-панели,
    // и список выбора должен обновиться сразу.
    [companyId, db.employees],
  );

  const users = useMemo(() => db.users.map(publicUser), [db.users]);

  const saveDocument = useCallback<SessionValue['saveDocument']>(
    (input) => {
      const now = new Date().toISOString();
      const company = companyId === null ? undefined : findCompanyIn(companyId);
      const existing =
        input.id === undefined ? undefined : loadDb().documents.find((d) => d.id === input.id);

      const record: DocumentRecord = {
        id: existing?.id ?? newId('d'),
        templateId: input.templateId,
        companyId: companyId ?? '',
        title: input.title,
        description: input.description.trim(),
        subject: input.subject.trim(),
        status: input.status,
        // Номер вводит человек. Это отступление от CLAUDE.md, п. 3.4, где
        // номер присваивает сервер при утверждении из счётчика под
        // блокировкой (docs/questions.md, Q17). Пустая строка остаётся null.
        number: input.number.trim() === '' ? null : input.number.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        values: input.values,
        // Снимок делается при сохранении, а не у черновика: черновик ещё не
        // выпущен и должен показывать текущие реквизиты и текущий справочник.
        ...(input.status === 'saved' && company !== undefined
          ? { companySnapshot: { ...company } }
          : {}),
        ...(input.status === 'saved'
          ? { peopleSnapshot: peopleReferencedBy(input.values, companyId ?? '') }
          : {}),
        authorId: existing?.authorId ?? user?.id ?? '',
        authorName: existing?.authorName ?? user?.displayName ?? '',
      };

      updateDb((cur) => {
        const documents =
          existing === undefined
            ? [record, ...cur.documents]
            : cur.documents.map((d) => (d.id === record.id ? record : d));

        // Черновик пишется при каждом нажатии клавиши — в журнал попадает
        // только создание и сохранение, иначе журнал станет нечитаемым.
        if (existing !== undefined && input.status === 'draft') {
          return { ...cur, documents };
        }

        return appendAudit(
          { ...cur, documents },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: record.companyId,
            event: existing === undefined ? 'document.create' : 'document.update',
            target: record.title,
          },
        );
      });

      return record;
    },
    [companyId, user],
  );

  const deleteDocument = useCallback<SessionValue['deleteDocument']>(
    (id) => {
      const now = new Date().toISOString();

      updateDb((cur) => {
        const target = cur.documents.find((d) => d.id === id);
        if (target === undefined) return cur;

        return appendAudit(
          {
            ...cur,
            // Физического удаления нет: запись помечается и пропадает из
            // реестров, но остаётся в базе (CLAUDE.md, п. 3.4).
            documents: cur.documents.map((d) =>
              d.id === id ? { ...d, deletedAt: now, deletedBy: user?.displayName ?? '' } : d,
            ),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'document.delete',
            target: target.title,
          },
        );
      });
    },
    [user],
  );

  const updateProfile = useCallback<SessionValue['updateProfile']>(
    (patch) => {
      if (userId === null) return;

      updateDb((cur) => ({
        ...cur,
        users: cur.users.map((u) => {
          if (u.id !== userId) return u;

          // `avatar: undefined` значит «убрать фотографию»: свойство именно
          // удаляется, а не остаётся со значением «ничего».
          const { avatar, ...rest } = patch;
          const next: StoredUser = { ...u, ...rest };

          if ('avatar' in patch) {
            if (avatar === undefined) delete next.avatar;
            else next.avatar = avatar;
          }

          return next;
        }),
      }));
    },
    [userId],
  );

  const changePassword = useCallback<SessionValue['changePassword']>(
    async (current, next) => {
      if (stored === null) return false;
      if (!(await verifyPassword(current, stored.password))) return false;

      const password = await hashPassword(next);
      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            users: cur.users.map((u) =>
              u.id === stored.id ? { ...u, password, failedAttempts: 0 } : u,
            ),
          },
          {
            userId: stored.id,
            userName: stored.displayName,
            companyId: '',
            event: 'auth.password-change',
            target: stored.login,
          },
        ),
      );
      return true;
    },
    [stored],
  );

  const createUser = useCallback<SessionValue['createUser']>(
    async (input) => {
      const login = input.login.trim();
      if (loadDb().users.some((u) => u.login.toLowerCase() === login.toLowerCase())) {
        return { ok: false, reason: 'login-taken' };
      }

      const password = await hashPassword(input.password);
      const id = newId('u');

      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            users: [
              ...cur.users,
              {
                id,
                login,
                displayName: input.displayName.trim(),
                role: input.role,
                companyIds: input.companyIds,
                sectionIds: input.sectionIds,
                createdAt: new Date().toISOString(),
                password,
                failedAttempts: 0,
                ...(input.position === undefined ? {} : { position: input.position }),
                ...(input.email === undefined ? {} : { email: input.email }),
                ...(input.phone === undefined ? {} : { phone: input.phone }),
              },
            ],
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: input.companyIds[0] ?? '',
            event: 'user.create',
            target: login,
          },
        ),
      );

      return { ok: true };
    },
    [user],
  );

  const updateUser = useCallback<SessionValue['updateUser']>(
    (id, patch) => {
      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            users: cur.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: '',
            event: 'user.update',
            target: cur.users.find((u) => u.id === id)?.login ?? id,
          },
        ),
      );
    },
    [user],
  );

  const setUserPassword = useCallback<SessionValue['setUserPassword']>(async (id, password) => {
    const hash = await hashPassword(password);
    updateDb((cur) => ({
      ...cur,
      users: cur.users.map((u) => (u.id === id ? { ...unlock(u), password: hash } : u)),
    }));
  }, []);

  const removeUser = useCallback<SessionValue['removeUser']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.users.find((u) => u.id === id);
        if (target === undefined) return cur;

        // Последнего администратора удалить нельзя: иначе в систему не войдёт
        // никто и её останется только стереть целиком.
        const adminsLeft = cur.users.filter(
          (u) => u.role === 'platform-admin' && u.id !== id,
        ).length;
        if (target.role === 'platform-admin' && adminsLeft === 0) return cur;

        return appendAudit(
          { ...cur, users: cur.users.filter((u) => u.id !== id) },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: '',
            event: 'user.delete',
            target: target.login,
          },
        );
      });
    },
    [user],
  );

  const saveCompany = useCallback<SessionValue['saveCompany']>(
    (company) => {
      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            companies: cur.companies.some((c) => c.id === company.id)
              ? cur.companies.map((c) => (c.id === company.id ? company : c))
              : [...cur.companies, company],
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: company.id,
            event: 'company.save',
            target: company.name,
          },
        ),
      );
    },
    [user],
  );

  const removeCompany = useCallback<SessionValue['removeCompany']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.companies.find((c) => c.id === id);
        if (target === undefined) return cur;

        return appendAudit(
          {
            ...cur,
            companies: cur.companies.filter((c) => c.id !== id),
            employees: cur.employees.filter((e) => e.companyId !== id),
            users: cur.users.map((u) => ({
              ...u,
              companyIds: u.companyIds.filter((c) => c !== id),
            })),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: id,
            event: 'company.delete',
            target: target.name,
          },
        );
      });
    },
    [user],
  );

  const saveEmployee = useCallback<SessionValue['saveEmployee']>((employee) => {
    updateDb((cur) => ({
      ...cur,
      employees: cur.employees.some((e) => e.id === employee.id)
        ? cur.employees.map((e) => (e.id === employee.id ? employee : e))
        : [...cur.employees, employee],
    }));
  }, []);

  const removeEmployee = useCallback<SessionValue['removeEmployee']>((id) => {
    updateDb((cur) => ({ ...cur, employees: cur.employees.filter((e) => e.id !== id) }));
  }, []);

  const saveSettings = useCallback<SessionValue['saveSettings']>((settings) => {
    updateDb((cur: Database) => ({ ...cur, settings }));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      company: companyId === null ? null : (findCompanyIn(companyId) ?? null),
      companies,
      documents,
      allVisibleDocuments,
      employees,
      allEmployees: db.employees,
      users,
      audit: db.audit,
      settings: db.settings,
      firstRun: db.users.length === 0,
      createFirstAdmin,
      signIn,
      signOut,
      confirmPassword,
      selectCompany,
      saveDocument,
      deleteDocument,
      findDocument: (id) => {
        const found = loadDb().documents.find((d) => d.id === id);
        if (found === undefined) return undefined;
        return visibleDocuments(subject, [found])[0];
      },
      updateProfile,
      changePassword,
      createUser,
      updateUser,
      setUserPassword,
      removeUser,
      saveCompany,
      removeCompany,
      saveEmployee,
      removeEmployee,
      saveSettings,
    }),
    [
      user,
      companyId,
      companies,
      documents,
      allVisibleDocuments,
      employees,
      db.employees,
      users,
      db.audit,
      db.settings,
      db.users.length,
      db.companies,
      subject,
      createFirstAdmin,
      signIn,
      signOut,
      confirmPassword,
      selectCompany,
      saveDocument,
      deleteDocument,
      updateProfile,
      changePassword,
      createUser,
      updateUser,
      setUserPassword,
      removeUser,
      saveCompany,
      removeCompany,
      saveEmployee,
      removeEmployee,
      saveSettings,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Карточки людей, на которых ссылаются значения полей.
 *
 * Работник лежит в значениях идентификатором, и без снимка правка справочника
 * переписала бы уже выпущенный документ (CLAUDE.md, п. 3.4). Вписанное руками
 * ФИО идентификатором не является и в снимок не попадает: оно и так хранится
 * текстом.
 */
function peopleReferencedBy(
  values: Record<string, string>,
  companyId: string,
): Record<string, EmployeeBrief> {
  const snapshot: Record<string, EmployeeBrief> = {};

  for (const value of Object.values(values)) {
    if (value === '' || value in snapshot) continue;

    const person = findEmployeeIn(companyId, value);
    if (person !== undefined) snapshot[value] = { ...person };
  }

  return snapshot;
}

/**
 * Снимает блокировку входа.
 *
 * Свойство именно удаляется, а не ставится в `undefined`: при строгой
 * настройке `exactOptionalPropertyTypes` это разные вещи, и в хранилище
 * должно оставаться отсутствие значения, а не значение «ничего».
 */
function unlock(user: StoredUser): StoredUser {
  const { lockedUntil: _locked, ...rest } = user;
  return { ...rest, failedAttempts: 0 };
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession вызван вне SessionProvider');
  }
  return value;
}
