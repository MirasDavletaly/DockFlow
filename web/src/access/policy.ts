/**
 * Политика доступа. Единственное место, где написано, кому что можно.
 *
 * В экранах нет проверок вида `if (user.role === 'director')` — только вызов
 * отсюда (CLAUDE.md, п. 3.2). Когда появится серверный `internal/access`,
 * этот файл должен повторять его, а не жить своей жизнью, поэтому правила
 * записаны так же: право, роль, компания.
 *
 * ВАЖНО. Это удобство интерфейса, а не защита. Всё, что решает браузер,
 * обходится через инструменты разработчика. Настоящую проверку делает
 * сервер (CLAUDE.md, п. 3.3: «сайт ничего не решает»).
 */
import { roleCan } from '@/api/mock/roles';

import type { Action, DocumentRecord, User } from '@/api/types';

/** Кто спрашивает: человек и компания, в которой он сейчас работает. */
export interface Subject {
  user: User | null;
  companyId: string | null;
}

/** Может ли человек выполнить действие. Без входа — ничего. */
export function can(subject: Subject, action: Action): boolean {
  if (subject.user === null || subject.user.blocked === true) return false;
  return roleCan(subject.user.role, action);
}

/** Работает ли человек во всех компаниях группы или только в своих. */
export function isPlatformWide(user: User | null): boolean {
  return user !== null && user.role === 'platform-admin';
}

/**
 * Доступна ли человеку компания.
 *
 * Администратор платформы работает во всех. Остальные — только там, где им
 * выдали доступ: список компаний берётся из учётной записи, а не из адреса
 * страницы (CLAUDE.md, п. 3.1).
 */
export function canUseCompany(user: User | null, companyId: string): boolean {
  if (user === null || user.blocked === true) return false;
  if (isPlatformWide(user)) return true;
  return user.companyIds.includes(companyId);
}

/**
 * Разрешён ли человеку раздел каталога — «юрисдикция».
 *
 * У директора и администратора список разделов пуст, и это значит «все».
 * У работника пустой список значит «ни одного»: по умолчанию запрещено,
 * разделы выдаёт администратор.
 */
export function canUseSection(user: User | null, sectionId: string): boolean {
  if (user === null || user.blocked === true) return false;
  if (user.role !== 'employee') return true;
  return user.sectionIds.includes(sectionId);
}

/**
 * Видит ли человек документ.
 *
 * Работник видит только свои. Директор — все документы своей компании.
 * Администратор — все. Удалённые документы видит только тот, кто может
 * их удалять: иначе «удалил» и «пропал» перестают совпадать.
 */
export function canViewDocument(subject: Subject, doc: DocumentRecord): boolean {
  const { user } = subject;
  if (user === null || user.blocked === true) return false;

  if (doc.deletedAt !== undefined && !can(subject, 'documents.delete')) return false;

  if (can(subject, 'documents.viewAll')) {
    return isPlatformWide(user) || user.companyIds.includes(doc.companyId);
  }

  return doc.authorId === user.id;
}

/**
 * Может ли человек править документ.
 *
 * Черновик правит тот, кто его завёл. Сохранённый документ правит только
 * директор или администратор — и это исправление ошибки, а не обычная
 * работа: на сервере оно будет создавать новую версию и запись в аудите.
 */
export function canEditDocument(subject: Subject, doc: DocumentRecord): boolean {
  if (!canViewDocument(subject, doc)) return false;
  if (doc.deletedAt !== undefined) return false;

  if (can(subject, 'documents.editAny')) return true;
  return doc.authorId === subject.user?.id && doc.status === 'draft';
}

/** Может ли человек удалить документ. Удаление — пометка, а не стирание. */
export function canDeleteDocument(subject: Subject, doc: DocumentRecord): boolean {
  if (!canViewDocument(subject, doc)) return false;
  if (doc.deletedAt !== undefined) return false;
  return can(subject, 'documents.delete');
}

/**
 * Отбирает документы, которые человеку видны.
 *
 * Фильтр стоит здесь, а не в экранах: на сервере он же уйдёт в SQL-запрос,
 * а не в цикл после выборки (CLAUDE.md, п. 3.2). Пока данные лежат в
 * браузере, важно хотя бы то, что правило одно и записано один раз.
 */
export function visibleDocuments(
  subject: Subject,
  documents: DocumentRecord[],
): DocumentRecord[] {
  return documents.filter((doc) => canViewDocument(subject, doc));
}
