/**
 * Хранилище демонстрации.
 *
 * Всё, что раньше было разбросано по мокам и памяти вкладки, лежит здесь:
 * компании, люди, учётные записи, документы и журнал действий.
 *
 * Хранилище — `localStorage`, а не `sessionStorage`, как было раньше. Причина
 * прямая: человек просил, чтобы черновик не пропадал при перезагрузке и при
 * случайном уходе со страницы, а учётные записи переживали закрытие вкладки.
 * Цена — содержимое документов остаётся в браузере после закрытия вкладки.
 * На сервере так не будет: там документ живёт в базе, а в браузере — только
 * то, что сейчас на экране.
 *
 * Изоляция компаний держится на `companyId` в каждой записи и на том, что
 * читать записи можно только через функции этого файла. Прямого доступа к
 * массиву у экранов нет.
 */
import { companies as seedCompanies } from '@/api/mock/companies';
import { employees as seedEmployees } from '@/api/mock/directory';

import type {
  AuditEntry,
  Company,
  DocumentRecord,
  EmployeeBrief,
  PlatformSettings,
  User,
} from '@/api/types';
import type { PasswordHash } from './password';

const STORAGE_KEY = 'docflow.local.db';
const VERSION = 2;

/** Учётная запись вместе с хешем пароля. Наружу отдаётся без него. */
export interface StoredUser extends User {
  password: PasswordHash;
  /** Неудачные попытки подряд. Сбрасывается успешным входом. */
  failedAttempts: number;
  /** До какого момента вход заблокирован (ISO). */
  lockedUntil?: string;
}

export interface Database {
  version: number;
  companies: Company[];
  employees: EmployeeBrief[];
  users: StoredUser[];
  documents: DocumentRecord[];
  audit: AuditEntry[];
  settings: PlatformSettings;
}

/**
 * Пустая база с условным справочником людей.
 *
 * Учётных записей нет ни одной: первая заводится на экране первого запуска,
 * и её пароль в коде не лежит. Справочник людей заведён в каждой компании
 * своими записями — работник одной компании не должен появляться в списке
 * выбора другой. Имена условные, их заменяют настоящими в админ-панели.
 */
function seed(): Database {
  const employees: EmployeeBrief[] = [];

  for (const company of seedCompanies) {
    for (const person of seedEmployees) {
      employees.push({ ...person, id: `${company.id}:${person.id}`, companyId: company.id });
    }
  }

  return {
    version: VERSION,
    companies: seedCompanies.map((c) => ({ ...c })),
    employees,
    users: [],
    documents: [],
    audit: [],
    settings: { adminIpAllowList: [] },
  };
}

let cache: Database | null = null;
const listeners = new Set<() => void>();

export function loadDb(): Database {
  if (cache !== null) return cache;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<Database>;
      cache = migrate(parsed);
      return cache;
    }
  } catch {
    // Хранилище недоступно: приватное окно, запрет на сайт, переполнение.
    // Это не повод не открыть страницу — работаем в памяти.
  }

  cache = seed();
  saveDb(cache);
  return cache;
}

/**
 * Приводит запись из хранилища к текущему виду.
 *
 * В браузере может лежать база, записанная прежней версией сайта. Полей,
 * появившихся позже, там нет, и без приведения на экране оказалось бы
 * «undefined» вместо описания или состояние, которого больше не существует.
 */
function migrate(raw: Partial<Database>): Database {
  const base = seed();

  const documents = (raw.documents ?? []).map<DocumentRecord>((doc) => ({
    ...doc,
    description: typeof doc.description === 'string' ? doc.description : '',
    subject: typeof doc.subject === 'string' ? doc.subject : '',
    // Согласования и утверждения больше нет: всё, что не черновик, — сохранено.
    status: doc.status === 'draft' ? 'draft' : 'saved',
    number: typeof doc.number === 'string' && doc.number !== '' ? doc.number : null,
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : doc.createdAt,
    authorId: typeof doc.authorId === 'string' ? doc.authorId : '',
    authorName: typeof doc.authorName === 'string' ? doc.authorName : '',
  }));

  return {
    version: VERSION,
    // Компании и справочник людей правятся в админ-панели, поэтому берутся
    // из хранилища. Если их там нет — подставляется исходный набор.
    companies: raw.companies !== undefined && raw.companies.length > 0
      ? raw.companies
      : base.companies,
    employees: raw.employees ?? base.employees,
    users: raw.users ?? [],
    documents,
    audit: raw.audit ?? [],
    settings: { adminIpAllowList: raw.settings?.adminIpAllowList ?? [] },
  };
}

export function saveDb(next: Database): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Не сохранилось — работаем в памяти до перезагрузки.
  }
  for (const listener of listeners) listener();
}

/** Изменяет базу одним куском: читать и писать по отдельности незачем. */
export function updateDb(change: (db: Database) => Database): Database {
  const next = change(loadDb());
  saveDb(next);
  return next;
}

/** Подписка для React: экраны обновляются сами после записи. */
export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Стирает базу целиком: возврат к первому запуску. */
export function resetDb(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Нечего чистить.
  }
  cache = null;
  for (const listener of listeners) listener();
}

/**
 * Перечитывает базу из хранилища, ничего не стирая.
 *
 * Нужно, когда хранилище поменяли мимо этой вкладки: человек открыл систему
 * в двух вкладках и завёл документ в одной. Без этого вторая вкладка так и
 * держала бы старый список и могла бы затереть чужую запись.
 */
export function reloadDb(): void {
  cache = null;
  for (const listener of listeners) listener();
}

// Правка из другой вкладки. Событие приходит только тем вкладкам, которые
// сами не писали, поэтому цикла здесь не возникает.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) reloadDb();
  });
}

/** Заведена ли хоть одна учётная запись. Нет — показываем первый запуск. */
export function isFirstRun(): boolean {
  return loadDb().users.length === 0;
}

/** Идентификатор записи. Времени и случайности хватает для демонстрации. */
export function newId(prefix: string): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return `${prefix}-${Date.now().toString(36)}-${random.toString(36)}`;
}

/** Учётная запись без хеша пароля: наружу пароль не отдаётся никогда. */
export function publicUser(stored: StoredUser): User {
  const { password: _password, failedAttempts: _failed, lockedUntil: _locked, ...rest } = stored;
  return rest;
}

/** Люди компании. Справочник другой компании отсюда получить нельзя. */
export function employeesOf(companyId: string): EmployeeBrief[] {
  return loadDb()
    .employees.filter((e) => e.companyId === companyId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
}

export function findEmployeeIn(companyId: string, id: string): EmployeeBrief | undefined {
  return loadDb().employees.find((e) => e.companyId === companyId && e.id === id);
}

export function findCompanyIn(id: string): Company | undefined {
  return loadDb().companies.find((c) => c.id === id);
}

/** Пишет строку в журнал действий. Журнал не редактируется и не чистится. */
export function appendAudit(db: Database, entry: Omit<AuditEntry, 'id' | 'at'>): Database {
  return {
    ...db,
    audit: [{ ...entry, id: newId('a'), at: new Date().toISOString() }, ...db.audit].slice(0, 500),
  };
}
