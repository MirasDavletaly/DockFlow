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

import {
  assignableRoles,
  can,
  canDeleteArchiveFile,
  canDeleteDocument,
  canGrantDocument,
  canManageUser,
  canPurgeArchiveFile,
  canPurgeDocument,
  canReceiveGrant,
  canRestoreArchiveFile,
  canRestoreDocument,
  canSeeAuditEntry,
  canSeeUser,
  canCreateTemplate,
  canEditTemplate,
  canUploadArchive,
  canUseCompany,
  canViewArchiveFile,
  grantableActions,
  managedCompanyIds,
  visibleArchive,
  visibleDocuments,
  visibleTemplates,
} from '@/access/policy';
import { checkTemplate, toDocumentTemplate } from '@/api/mock/customTemplates';
import {
  appendAudit,
  dropCompany,
  employeesOf,
  findCompanyIn,
  findEmployeeIn,
  internImage,
  loadDb,
  newId,
  pruneImages,
  publicUser,
  resolveImage,
  subscribeDb,
  updateDb,
} from '@/store/db';
import { DocumentNumberTakenError, findNumberHolder } from '@/store/documentNumber';
import { deleteFile, getFile, putFile } from '@/store/files';
import { hashPassword, verifyPassword } from '@/store/password';
import { withRussianSpelling } from '@/utils/names';
import { MAX_PDF_BYTES, isPdf, readBytes, sha256Hex } from '@/utils/pdf';

import type {
  Action,
  ArchiveFile,
  AuditEntry,
  Company,
  CustomTemplate,
  DocumentRecord,
  DocumentTemplate,
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
  viewSectionIds: string[];
  /** Права поверх роли: только из тех, что выдающий может выдать. */
  grantedActions?: Action[];
  position?: string;
  email?: string;
  phone?: string;
}

/** Что директор и администратор меняют в чужой учётной записи. */
export interface UserAccessPatch {
  displayName?: string;
  position?: string;
  role?: RoleId;
  companyIds?: string[];
  sectionIds?: string[];
  viewSectionIds?: string[];
  grantedActions?: Action[];
  blocked?: boolean;
}

/** Шаблон из конструктора, каким его отдаёт экран: без компании и автора. */
export type TemplateInput = Omit<
  CustomTemplate,
  'id' | 'companyId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy'
> & { id?: string };

/** Старый документ, который кладут в архив файлом PDF. */
export interface ArchiveUploadInput {
  file: File;
  title: string;
  number: string;
  documentDate: string;
  sectionId: string;
  description: string;
}

export type ArchiveUploadResult =
  | 'ok'
  | 'denied'
  | 'not-pdf'
  | 'too-big'
  | 'duplicate'
  | 'storage-failed';

export type ArchiveOpenResult =
  | { ok: true; blob: Blob; file: ArchiveFile }
  | { ok: false; reason: 'denied' | 'missing' | 'corrupted' };

export interface SaveDocumentInput {
  /** Есть — правим существующую запись, нет — заводим новую. */
  id?: string;
  templateId: string;
  /** Раздел каталога: по нему открывается просмотр документов раздела. */
  sectionId: string;
  title: string;
  /** Английское название шаблона из конструктора. */
  titleEn?: string;
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
  /**
   * Все видимые документы во всех доступных компаниях, включая удалённые:
   * только для админ-панели, где из корзины их возвращают.
   */
  allVisibleDocuments: DocumentRecord[];
  /** Люди текущей компании: список выбора в формах. */
  employees: EmployeeBrief[];
  /** Справочники всех компаний: нужны только админ-панели. */
  allEmployees: EmployeeBrief[];
  /** Учётные записи, которые человеку видны в админ-панели (`canSeeUser`). */
  users: User[];
  /** Записи журнала, которые человеку видны (`canSeeAuditEntry`). */
  audit: AuditEntry[];
  settings: PlatformSettings;
  firstRun: boolean;
  /**
   * Пароль для админ-панели уже подтверждён в этом входе. Спрашивается один
   * раз и забывается при выходе («Тест день 2»).
   */
  adminUnlocked: boolean;
  unlockAdmin: () => void;
  lockAdmin: () => void;

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

  /**
   * Сохраняет документ. Сохранение с номером, который уже стоит на другом
   * документе компании, отказывается исключением `DocumentNumberTakenError`:
   * экран проверяет номер заранее через `numberTaken`, а это – последняя
   * линия защиты.
   */
  saveDocument: (input: SaveDocumentInput) => DocumentRecord;
  /** Занят ли номер в текущей компании другим сохранённым документом. */
  numberTaken: (number: string, exceptId?: string) => boolean;
  deleteDocument: (id: string) => void;
  /** Возвращает удалённый документ в реестр. */
  restoreDocument: (id: string) => void;
  /**
   * Стирает документ из корзины навсегда («Тест день 3»). Живой документ не
   * стирается: сначала он должен попасть в корзину. В журнале остаётся запись.
   */
  purgeDocument: (id: string) => void;
  /** Файлы архива текущей компании, которые человеку видны. */
  archive: ArchiveFile[];
  uploadArchiveFile: (input: ArchiveUploadInput) => Promise<ArchiveUploadResult>;
  /** Достаёт файл и сверяет его SHA-256 с тем, что записали при загрузке. */
  openArchiveFile: (id: string) => Promise<ArchiveOpenResult>;
  deleteArchiveFile: (id: string) => void;
  /** Удалённые файлы архива во всех доступных компаниях: корзина админ-панели. */
  archiveBin: ArchiveFile[];
  restoreArchiveFile: (id: string) => void;
  /** Стирает файл из корзины навсегда: запись и сам файл в хранилище. */
  purgeArchiveFile: (id: string) => Promise<void>;
  /** Выдаёт или снимает (`null`) доступ человека к документу. */
  setDocumentGrant: (docId: string, userId: string, level: 'view' | 'edit' | null) => void;
  findDocument: (id: string) => DocumentRecord | undefined;

  updateProfile: (patch: ProfilePatch) => void;
  changePassword: (current: string, next: string) => Promise<boolean>;

  createUser: (input: NewUserInput) => Promise<{ ok: boolean; reason?: 'login-taken' }>;
  updateUser: (id: string, patch: UserAccessPatch) => void;
  setUserPassword: (id: string, password: string) => Promise<void>;
  removeUser: (id: string) => void;

  saveCompany: (company: Company) => void;
  removeCompany: (id: string) => void;

  saveEmployee: (employee: EmployeeBrief) => void;
  removeEmployee: (id: string) => void;

  saveSettings: (settings: PlatformSettings) => void;

  /** Шаблоны из конструктора текущей компании, которые человеку видны. */
  templates: CustomTemplate[];
  /**
   * Шаблон компании для формы и листа. У сохранённого документа – его снимок:
   * правка и удаление шаблона выпущенный документ не меняют (CLAUDE.md,
   * п. 3.4). Шаблоны каталога здесь не ищутся – их экраны берут сами.
   */
  findCompanyTemplate: (id: string, record?: DocumentRecord) => DocumentTemplate | undefined;
  /** Шаблон для правки в конструкторе, если человеку его можно править. */
  editableTemplate: (id: string) => CustomTemplate | undefined;
  /** Сохраняет шаблон. Нет права или шаблон не заполнен – `null`. */
  saveTemplate: (input: TemplateInput) => CustomTemplate | null;
  /** Убирает шаблон из каталога. Созданные по нему документы остаются. */
  deleteTemplate: (id: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const SESSION_KEY = 'docflow.session';

interface Persisted {
  userId: string | null;
  companyId: string | null;
  adminUnlocked?: boolean;
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
  // Живёт в `sessionStorage` вместе с входом: переключение языка перерисовывает
  // дерево и раньше выбрасывало из панели, а выход стирает отметку целиком.
  const [adminUnlocked, setAdminUnlocked] = useState(initial.adminUnlocked === true);

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
    setAdminUnlocked(false);

    // Человеку с одной компанией выбирать не из чего — входим сразу в неё.
    const only =
      candidate.role === 'platform-admin' || candidate.companyIds.length !== 1
        ? null
        : (candidate.companyIds[0] ?? null);

    setCompanyId(only);
    persist({ userId: candidate.id, companyId: only, adminUnlocked: false });
    return 'ok';
  }, [persist]);

  const signOut = useCallback(() => {
    setUserId(null);
    setCompanyId(null);
    setAdminUnlocked(false);
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

  const unlockAdmin = useCallback(() => {
    setAdminUnlocked(true);
    persist({ adminUnlocked: true });
  }, [persist]);

  const lockAdmin = useCallback(() => {
    setAdminUnlocked(false);
    persist({ adminUnlocked: false });
  }, [persist]);

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
      visibleDocuments(subject, db.documents, { withDeleted: true }).sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [db.documents, subject],
  );

  const archive = useMemo(() => {
    if (companyId === null) return [];
    return visibleArchive(
      subject,
      db.archive.filter((f) => f.companyId === companyId),
    ).sort((a, b) => b.documentDate.localeCompare(a.documentDate));
  }, [db.archive, companyId, subject]);

  const employees = useMemo(
    () => (companyId === null ? [] : employeesOf(companyId)),
    // db.employees в зависимостях нарочно: справочник правится в админ-панели,
    // и список выбора должен обновиться сразу.
    [companyId, db.employees],
  );

  const users = useMemo(
    () => db.users.map(publicUser).filter((target) => canSeeUser(subject, target)),
    [db.users, subject],
  );

  const audit = useMemo(
    () => db.audit.filter((entry) => canSeeAuditEntry(subject, entry)),
    [db.audit, subject],
  );

  const saveDocument = useCallback<SessionValue['saveDocument']>(
    (input) => {
      const now = new Date().toISOString();
      const company = companyId === null ? undefined : findCompanyIn(companyId);
      const existing =
        input.id === undefined ? undefined : loadDb().documents.find((d) => d.id === input.id);

      if (
        input.status === 'saved' &&
        findNumberHolder(loadDb().documents, companyId ?? '', input.number, existing?.id) !==
          undefined
      ) {
        throw new DocumentNumberTakenError(input.number);
      }

      const record: DocumentRecord = {
        id: existing?.id ?? newId('d'),
        templateId: input.templateId,
        sectionId: input.sectionId,
        companyId: companyId ?? '',
        title: input.title,
        ...(input.titleEn === undefined || input.titleEn === '' ? {} : { titleEn: input.titleEn }),
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
        ...templateSnapshotFor(input.templateId, companyId ?? '', existing),
        authorId: existing?.authorId ?? user?.id ?? '',
        authorName: existing?.authorName ?? user?.displayName ?? '',
        // Выданный доступ переживает правку документа.
        ...(existing?.grants === undefined ? {} : { grants: existing.grants }),
      };

      updateDb((current) => {
        // Логотип из снимка – в общее хранилище картинок, в снимке – ссылка:
        // иначе каждый документ нёс бы свою копию картинки (`Database.images`).
        const logo = record.companySnapshot?.logo;
        const [cur, logoRef] =
          logo === undefined ? [current, undefined] : internImage(current, logo);
        const stored: DocumentRecord =
          record.companySnapshot === undefined || logoRef === undefined
            ? record
            : { ...record, companySnapshot: { ...record.companySnapshot, logo: logoRef } };

        const documents =
          existing === undefined
            ? [stored, ...cur.documents]
            : cur.documents.map((d) => (d.id === stored.id ? stored : d));

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
        // Вторая проверка – здесь, а не только на экране (CLAUDE.md, п. 3.2).
        if (target === undefined || !canDeleteDocument(subject, target)) return cur;

        return appendAudit(
          {
            ...cur,
            // Удаление – пометка: запись пропадает из реестров и лежит в
            // корзине, откуда её возвращают или стирают навсегда.
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
    [subject, user],
  );

  const numberTaken = useCallback<SessionValue['numberTaken']>(
    (number, exceptId) =>
      // Проверка идёт по всем документам компании, а не по видимым человеку:
      // номер уникален в компании, как ограничение в базе. Наружу уходит
      // только «занят», без названия чужого документа.
      companyId !== null &&
      findNumberHolder(db.documents, companyId, number, exceptId) !== undefined,
    [db.documents, companyId],
  );

  const restoreDocument = useCallback<SessionValue['restoreDocument']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.documents.find((d) => d.id === id);
        if (target === undefined || !canRestoreDocument(subject, target)) return cur;

        return appendAudit(
          {
            ...cur,
            documents: cur.documents.map((d) => {
              if (d.id !== id) return d;
              const { deletedAt: _at, deletedBy: _by, ...alive } = d;
              return alive;
            }),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'document.restore',
            target: target.title,
          },
        );
      });
    },
    [subject, user],
  );

  const purgeDocument = useCallback<SessionValue['purgeDocument']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.documents.find((d) => d.id === id);
        if (target === undefined || !canPurgeDocument(subject, target)) return cur;

        return appendAudit(
          pruneImages({ ...cur, documents: cur.documents.filter((d) => d.id !== id) }),
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'document.purge',
            // Самого документа больше нет: в журнале остаётся, что это было.
            target: target.number === null ? target.title : `${target.title} № ${target.number}`,
          },
        );
      });
    },
    [subject, user],
  );

  const uploadArchiveFile = useCallback<SessionValue['uploadArchiveFile']>(
    async (input) => {
      // Компания – только из сессии, не из формы (CLAUDE.md, п. 3.1).
      if (companyId === null || user === null) return 'denied';
      if (!canUploadArchive(subject, companyId, input.sectionId)) return 'denied';
      if (input.file.size > MAX_PDF_BYTES) return 'too-big';

      const buffer = await readBytes(input.file);
      if (!isPdf(new Uint8Array(buffer))) return 'not-pdf';

      const sha256 = await sha256Hex(buffer);
      // Один и тот же файл дважды в архиве компании – это дубль, а не новый
      // документ. Повторное нажатие «Загрузить» тоже не создаёт второй записи.
      const duplicate = loadDb().archive.some(
        (f) => f.companyId === companyId && f.deletedAt === undefined && f.sha256 === sha256,
      );
      if (duplicate) return 'duplicate';

      const id = newId('f');
      try {
        await putFile(id, new Blob([buffer], { type: 'application/pdf' }));
      } catch {
        return 'storage-failed';
      }

      const record: ArchiveFile = {
        id,
        companyId,
        title: input.title.trim(),
        number: input.number.trim() === '' ? null : input.number.trim(),
        documentDate: input.documentDate,
        sectionId: input.sectionId,
        description: input.description.trim(),
        fileName: input.file.name,
        size: buffer.byteLength,
        sha256,
        uploadedBy: user.id,
        uploadedByName: user.displayName,
        uploadedAt: new Date().toISOString(),
      };

      updateDb((cur) =>
        appendAudit(
          { ...cur, archive: [record, ...cur.archive] },
          {
            userId: user.id,
            userName: user.displayName,
            companyId,
            event: 'archive.upload',
            target: record.title,
          },
        ),
      );
      return 'ok';
    },
    [companyId, subject, user],
  );

  const openArchiveFile = useCallback<SessionValue['openArchiveFile']>(
    async (id) => {
      const file = loadDb().archive.find((f) => f.id === id);
      if (file === undefined || !canViewArchiveFile(subject, file)) {
        return { ok: false, reason: 'denied' };
      }

      const blob = await getFile(id).catch(() => undefined);
      if (blob === undefined) return { ok: false, reason: 'missing' };

      // Файл, который изменили в хранилище мимо системы, не выдаётся.
      const actual = await sha256Hex(await readBytes(blob));
      if (actual !== file.sha256) return { ok: false, reason: 'corrupted' };

      return { ok: true, blob, file };
    },
    [subject],
  );

  const deleteArchiveFile = useCallback<SessionValue['deleteArchiveFile']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.archive.find((f) => f.id === id);
        if (target === undefined || !canDeleteArchiveFile(subject, target)) return cur;

        return appendAudit(
          {
            ...cur,
            archive: cur.archive.map((f) =>
              f.id === id
                ? { ...f, deletedAt: new Date().toISOString(), deletedBy: user?.displayName ?? '' }
                : f,
            ),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'archive.delete',
            target: target.title,
          },
        );
      });
    },
    [subject, user],
  );

  const archiveBin = useMemo(
    () =>
      visibleArchive(subject, db.archive, { withDeleted: true })
        .filter((f) => f.deletedAt !== undefined)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')),
    [db.archive, subject],
  );

  const restoreArchiveFile = useCallback<SessionValue['restoreArchiveFile']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.archive.find((f) => f.id === id);
        if (target === undefined || !canRestoreArchiveFile(subject, target)) return cur;

        return appendAudit(
          {
            ...cur,
            archive: cur.archive.map((f) => {
              if (f.id !== id) return f;
              const { deletedAt: _at, deletedBy: _by, ...alive } = f;
              return alive;
            }),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'archive.restore',
            target: target.title,
          },
        );
      });
    },
    [subject, user],
  );

  const purgeArchiveFile = useCallback<SessionValue['purgeArchiveFile']>(
    async (id) => {
      const target = loadDb().archive.find((f) => f.id === id);
      if (target === undefined || !canPurgeArchiveFile(subject, target)) return;

      // Сначала запись, потом файл: если хранилище файлов недоступно, в базе
      // не останется записи, которая ссылается на стёртое.
      updateDb((cur) =>
        appendAudit(
          { ...cur, archive: cur.archive.filter((f) => f.id !== id) },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'archive.purge',
            target: target.title,
          },
        ),
      );
      await deleteFile(id).catch(() => undefined);
    },
    [subject, user],
  );

  const setDocumentGrant = useCallback<SessionValue['setDocumentGrant']>(
    (docId, targetId, level) => {
      updateDb((cur) => {
        const doc = cur.documents.find((d) => d.id === docId);
        const target = cur.users.find((u) => u.id === targetId);
        if (doc === undefined || target === undefined) return cur;

        // Вторая проверка – здесь, а не только на экране (CLAUDE.md, п. 3.2):
        // кнопку можно вызвать и мимо интерфейса.
        if (!canGrantDocument(subject, doc)) return cur;
        if (level !== null && !canReceiveGrant(subject, doc, publicUser(target))) return cur;

        const rest = (doc.grants ?? []).filter((g) => g.userId !== targetId);
        const grants =
          level === null
            ? rest
            : [
                ...rest,
                {
                  userId: targetId,
                  level,
                  grantedBy: user?.displayName ?? '',
                  grantedAt: new Date().toISOString(),
                },
              ];

        return appendAudit(
          {
            ...cur,
            documents: cur.documents.map((d) => (d.id === docId ? { ...d, grants } : d)),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: doc.companyId,
            event: level === null ? 'document.revoke' : `document.grant.${level}`,
            target: `${doc.title} – ${target.displayName}`,
          },
        );
      });
    },
    [subject, user],
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

  /**
   * Компании из списка, которыми человек управляет. Директор не может выдать
   * сотруднику доступ к компании, в которой сам не работает.
   */
  const withinScope = useCallback(
    (ids: string[]): string[] => {
      const scope = managedCompanyIds(subject);
      return scope === null ? ids : ids.filter((id) => scope.includes(id));
    },
    [subject],
  );

  /** Права поверх роли для новой учётной записи – только выдаваемые. */
  const grantedFor = useCallback(
    (requested: Action[] | undefined): { grantedActions?: Action[] } => {
      const allowed = grantableActions(subject);
      const granted = (requested ?? []).filter((a) => allowed.includes(a));
      return granted.length === 0 ? {} : { grantedActions: granted };
    },
    [subject],
  );

  const createUser = useCallback<SessionValue['createUser']>(
    async (input) => {
      // Проверка и здесь, а не только на экране (CLAUDE.md, п. 3.2): директор
      // заводит только сотрудников и только в свои компании.
      if (!assignableRoles(subject).includes(input.role)) return { ok: false };
      const companyIds = input.role === 'platform-admin' ? [] : withinScope(input.companyIds);
      if (input.role !== 'platform-admin' && companyIds.length === 0) return { ok: false };

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
                companyIds,
                sectionIds: input.sectionIds,
                viewSectionIds: input.viewSectionIds,
                ...grantedFor(input.grantedActions),
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
            companyId: companyIds[0] ?? '',
            event: 'user.create',
            target: login,
          },
        ),
      );

      return { ok: true };
    },
    [grantedFor, subject, user, withinScope],
  );

  const updateUser = useCallback<SessionValue['updateUser']>(
    (id, patch) => {
      updateDb((cur) => {
        const target = cur.users.find((u) => u.id === id);
        if (target === undefined || !canManageUser(subject, publicUser(target))) return cur;
        if (patch.role !== undefined && !assignableRoles(subject).includes(patch.role)) return cur;

        const next: StoredUser = { ...target };
        if (patch.displayName !== undefined) next.displayName = patch.displayName.trim();
        if (patch.position !== undefined) next.position = patch.position.trim();
        if (patch.role !== undefined) next.role = patch.role;
        if (patch.sectionIds !== undefined) next.sectionIds = patch.sectionIds;
        if (patch.viewSectionIds !== undefined) next.viewSectionIds = patch.viewSectionIds;
        if (patch.grantedActions !== undefined) {
          // Выдаётся только то, что выдающий может выдать; права, которых он
          // выдавать не может, остаются как были.
          const allowed = grantableActions(subject);
          const kept = (target.grantedActions ?? []).filter((a) => !allowed.includes(a));
          const granted = [...kept, ...patch.grantedActions.filter((a) => allowed.includes(a))];
          if (granted.length === 0) delete next.grantedActions;
          else next.grantedActions = granted;
        }
        if (patch.blocked !== undefined) next.blocked = patch.blocked;
        if (patch.companyIds !== undefined) {
          // Компании вне своей зоны директор не видит и снять не может: они
          // остаются как были, меняется только то, чем он управляет.
          const scope = managedCompanyIds(subject);
          next.companyIds =
            scope === null
              ? patch.companyIds
              : [
                  ...target.companyIds.filter((c) => !scope.includes(c)),
                  ...patch.companyIds.filter((c) => scope.includes(c)),
                ];
        }
        if (next.role === 'platform-admin') next.companyIds = [];

        return appendAudit(
          { ...cur, users: cur.users.map((u) => (u.id === id ? next : u)) },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: withinScope(next.companyIds)[0] ?? '',
            event: patch.blocked === undefined ? 'user.update' : patch.blocked ? 'user.block' : 'user.unblock',
            target: target.login,
          },
        );
      });
    },
    [subject, user, withinScope],
  );

  const setUserPassword = useCallback<SessionValue['setUserPassword']>(
    async (id, password) => {
      const target = loadDb().users.find((u) => u.id === id);
      if (target === undefined || !canManageUser(subject, publicUser(target))) return;

      const hash = await hashPassword(password);
      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            users: cur.users.map((u) => (u.id === id ? { ...unlock(u), password: hash } : u)),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: withinScope(target.companyIds)[0] ?? '',
            event: 'user.password-reset',
            target: target.login,
          },
        ),
      );
    },
    [subject, user, withinScope],
  );

  const removeUser = useCallback<SessionValue['removeUser']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.users.find((u) => u.id === id);
        if (target === undefined || !canManageUser(subject, publicUser(target))) return cur;

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
            companyId: withinScope(target.companyIds)[0] ?? '',
            event: 'user.delete',
            target: target.login,
          },
        );
      });
    },
    [subject, user, withinScope],
  );

  const saveCompany = useCallback<SessionValue['saveCompany']>(
    (company) => {
      updateDb((cur) => {
        const exists = cur.companies.some((c) => c.id === company.id);
        // Новую компанию заводит только администратор, реквизиты своей
        // компании правит и директор.
        if (!exists && !can(subject, 'company.create')) return cur;
        if (exists && !(can(subject, 'company.edit') && canUseCompany(user, company.id))) {
          return cur;
        }

        return appendAudit(
          {
            ...cur,
            companies: exists
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
        );
      });
    },
    [subject, user],
  );

  const removeCompany = useCallback<SessionValue['removeCompany']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.companies.find((c) => c.id === id);
        if (target === undefined || !can(subject, 'company.create')) return cur;

        return appendAudit(
          dropCompany(cur, id, user?.displayName ?? ''),
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
    [subject, user],
  );

  /** Персонал правит тот, кто управляет людьми этой компании. */
  const managesCompany = useCallback(
    (id: string) => withinScope([id]).length === 1 && can(subject, 'people.manage'),
    [subject, withinScope],
  );

  const saveEmployee = useCallback<SessionValue['saveEmployee']>(
    (input) => {
      if (!managesCompany(input.companyId)) return;
      // Правило одно для всех путей записи: русское ФИО – русскими буквами,
      // казахское – в своём поле (docs/translation-rules.md).
      const employee = withRussianSpelling(input);

      updateDb((cur) => {
        const existing = cur.employees.find((e) => e.id === employee.id);
        // Карточку другой компании нельзя переписать, подменив companyId.
        if (existing !== undefined && existing.companyId !== employee.companyId) return cur;

        return appendAudit(
          {
            ...cur,
            employees:
              existing === undefined
                ? [...cur.employees, employee]
                : cur.employees.map((e) => (e.id === employee.id ? employee : e)),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: employee.companyId,
            event: existing === undefined ? 'personnel.create' : 'personnel.update',
            target: employee.fullName,
          },
        );
      });
    },
    [managesCompany, user],
  );

  const removeEmployee = useCallback<SessionValue['removeEmployee']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.employees.find((e) => e.id === id);
        if (target === undefined || !managesCompany(target.companyId)) return cur;

        return appendAudit(
          { ...cur, employees: cur.employees.filter((e) => e.id !== id) },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'personnel.delete',
            target: target.fullName,
          },
        );
      });
    },
    [managesCompany, user],
  );

  const saveSettings = useCallback<SessionValue['saveSettings']>(
    (settings) => {
      if (!can(subject, 'settings.manage')) return;
      updateDb((cur: Database) =>
        appendAudit(
          { ...cur, settings },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: '',
            event: 'settings.save',
            target: settings.adminIpAllowList.map((a) => a.ip).join(', '),
          },
        ),
      );
    },
    [subject, user],
  );

  const templates = useMemo(
    () =>
      visibleTemplates(subject, db.templates).sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [db.templates, subject],
  );

  const findCompanyTemplate = useCallback<SessionValue['findCompanyTemplate']>(
    (id, record) => {
      if (record?.status === 'saved' && record.templateSnapshot !== undefined) {
        return record.templateSnapshot;
      }
      const live = templates.find((tpl) => tpl.id === id);
      return live === undefined ? record?.templateSnapshot : toDocumentTemplate(live);
    },
    [templates],
  );

  const editableTemplate = useCallback<SessionValue['editableTemplate']>(
    (id) => {
      const found = db.templates.find((tpl) => tpl.id === id);
      return found !== undefined && canEditTemplate(subject, found) ? found : undefined;
    },
    [db.templates, subject],
  );

  const saveTemplate = useCallback<SessionValue['saveTemplate']>(
    (input) => {
      // Компания – только из сессии (CLAUDE.md, п. 3.1): шаблон не завести в
      // чужой компании, подменив поле в запросе.
      if (companyId === null || user === null) return null;

      const existing =
        input.id === undefined ? undefined : loadDb().templates.find((tpl) => tpl.id === input.id);
      if (existing !== undefined && !canEditTemplate(subject, existing)) return null;
      if (!canCreateTemplate(subject, input.sectionId)) return null;

      const now = new Date().toISOString();
      const { id: _id, ...fields } = input;
      const record: CustomTemplate = {
        ...fields,
        id: existing?.id ?? newId('custom'),
        companyId,
        authorId: existing?.authorId ?? user.id,
        authorName: existing?.authorName ?? user.displayName,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (checkTemplate(record).length > 0) return null;

      updateDb((cur) =>
        appendAudit(
          {
            ...cur,
            templates:
              existing === undefined
                ? [...cur.templates, record]
                : cur.templates.map((tpl) => (tpl.id === record.id ? record : tpl)),
          },
          {
            userId: user.id,
            userName: user.displayName,
            companyId,
            event: existing === undefined ? 'template.create' : 'template.update',
            target: record.title,
          },
        ),
      );
      return record;
    },
    [companyId, subject, user],
  );

  const deleteTemplate = useCallback<SessionValue['deleteTemplate']>(
    (id) => {
      updateDb((cur) => {
        const target = cur.templates.find((tpl) => tpl.id === id);
        if (target === undefined || !canEditTemplate(subject, target)) return cur;

        return appendAudit(
          {
            ...cur,
            templates: cur.templates.map((tpl) =>
              tpl.id === id
                ? { ...tpl, deletedAt: new Date().toISOString(), deletedBy: user?.displayName ?? '' }
                : tpl,
            ),
          },
          {
            userId: user?.id ?? '',
            userName: user?.displayName ?? '',
            companyId: target.companyId,
            event: 'template.delete',
            target: target.title,
          },
        );
      });
    },
    [subject, user],
  );

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
      audit,
      settings: db.settings,
      firstRun: db.users.length === 0,
      adminUnlocked,
      unlockAdmin,
      lockAdmin,
      createFirstAdmin,
      signIn,
      signOut,
      confirmPassword,
      selectCompany,
      saveDocument,
      numberTaken,
      deleteDocument,
      restoreDocument,
      purgeDocument,
      setDocumentGrant,
      archive,
      uploadArchiveFile,
      openArchiveFile,
      deleteArchiveFile,
      archiveBin,
      restoreArchiveFile,
      purgeArchiveFile,
      findDocument: (id) => {
        const found = loadDb().documents.find((d) => d.id === id);
        if (found === undefined) return undefined;
        // Удалённый документ открывается из корзины админ-панели: политика
        // пустит к нему только того, кто может его вернуть.
        const visible = visibleDocuments(subject, [found], { withDeleted: true })[0];
        const snapshot = visible?.companySnapshot;
        if (visible === undefined || snapshot?.logo === undefined) return visible;
        // В снимке – ссылка на картинку в общем хранилище; лист получает саму картинку.
        const logo = resolveImage(snapshot.logo);
        const { logo: _ref, ...rest } = snapshot;
        return { ...visible, companySnapshot: logo === undefined ? rest : { ...rest, logo } };
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
      templates,
      findCompanyTemplate,
      editableTemplate,
      saveTemplate,
      deleteTemplate,
    }),
    [
      templates,
      findCompanyTemplate,
      editableTemplate,
      saveTemplate,
      deleteTemplate,
      user,
      companyId,
      companies,
      documents,
      allVisibleDocuments,
      employees,
      db.employees,
      users,
      audit,
      db.settings,
      adminUnlocked,
      unlockAdmin,
      lockAdmin,
      setDocumentGrant,
      archive,
      uploadArchiveFile,
      openArchiveFile,
      deleteArchiveFile,
      archiveBin,
      restoreArchiveFile,
      purgeArchiveFile,
      purgeDocument,
      db.users.length,
      db.companies,
      subject,
      createFirstAdmin,
      signIn,
      signOut,
      confirmPassword,
      selectCompany,
      saveDocument,
      numberTaken,
      deleteDocument,
      restoreDocument,
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
 * Снимок шаблона компании для записи документа.
 *
 * Выпущенный документ держит тот шаблон, по которому его выпустили: правка
 * сохранённого документа снимок не меняет. Черновик и новый документ берут
 * текущую версию шаблона. У шаблонов каталога снимка нет.
 */
function templateSnapshotFor(
  templateId: string,
  companyId: string,
  existing: DocumentRecord | undefined,
): { templateSnapshot?: DocumentTemplate } {
  if (existing?.status === 'saved' && existing.templateSnapshot !== undefined) {
    return { templateSnapshot: existing.templateSnapshot };
  }
  const custom = loadDb().templates.find(
    (tpl) => tpl.id === templateId && tpl.companyId === companyId && tpl.deletedAt === undefined,
  );
  if (custom !== undefined) return { templateSnapshot: toDocumentTemplate(custom) };
  return existing?.templateSnapshot === undefined ? {} : { templateSnapshot: existing.templateSnapshot };
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
