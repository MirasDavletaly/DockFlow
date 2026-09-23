/**
 * Изоляция компаний и доступ к документам.
 *
 * Это тот случай, ради которого правила вынесены в один модуль: ошибка здесь
 * означает, что работник одной компании увидел документ другой, а это утечка
 * персональных данных или коммерческой тайны (CLAUDE.md, п. 3.1).
 *
 * На сервере такие же проверки будут в `internal/access` и в SQL-запросе.
 * Эти тесты — их браузерный двойник, и когда появится сервер, они должны
 * совпадать по смыслу, а не расходиться.
 */
import { describe, expect, it } from 'vitest';

import {
  assignableRoles,
  can,
  canDeleteDocument,
  canEditDocument,
  canGrantDocument,
  canManageUser,
  canReceiveGrant,
  canRestoreDocument,
  canSeeAuditEntry,
  canSeeUser,
  canUseCompany,
  canUseSection,
  canViewDocument,
  managedCompanyIds,
  sectionOfDocument,
  visibleDocuments,
} from './policy';

import type { DocumentRecord, RoleId, User } from '@/api/types';

const COMPANY_A = 'c-a';
const COMPANY_B = 'c-b';

function user(id: string, role: RoleId, overrides: Partial<User> = {}): User {
  return {
    id,
    login: id,
    displayName: id,
    role,
    companyIds: role === 'platform-admin' ? [] : [COMPANY_A],
    sectionIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function doc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'd-1',
    templateId: 'hr-hire-order',
    companyId: COMPANY_A,
    title: 'Приказ о приёме на работу',
    description: '',
    subject: '',
    status: 'saved',
    number: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    values: {},
    authorId: 'u-employee',
    authorName: 'Работник',
    ...overrides,
  };
}

const admin = user('u-admin', 'platform-admin');
const director = user('u-director', 'director');
const employee = user('u-employee', 'employee', { sectionIds: ['hr'] });
const other = user('u-other', 'employee', { sectionIds: ['hr'] });

describe('компании', () => {
  it('администратор работает во всех компаниях', () => {
    expect(canUseCompany(admin, COMPANY_A)).toBe(true);
    expect(canUseCompany(admin, COMPANY_B)).toBe(true);
  });

  it('работник не попадает в компанию, к которой ему не выдали доступ', () => {
    expect(canUseCompany(employee, COMPANY_A)).toBe(true);
    expect(canUseCompany(employee, COMPANY_B)).toBe(false);
  });

  it('без входа не доступна ни одна компания', () => {
    expect(canUseCompany(null, COMPANY_A)).toBe(false);
  });

  it('заблокированная учётная запись теряет доступ сразу', () => {
    const blocked = user('u-blocked', 'director', { blocked: true });
    expect(canUseCompany(blocked, COMPANY_A)).toBe(false);
    expect(can({ user: blocked, companyId: COMPANY_A }, 'documents.viewAll')).toBe(false);
  });
});

describe('разделы каталога', () => {
  it('работнику открыты только выданные разделы, по умолчанию запрещено', () => {
    expect(canUseSection(employee, 'hr')).toBe(true);
    expect(canUseSection(employee, 'finance')).toBe(false);
    expect(canUseSection(user('u-new', 'employee'), 'hr')).toBe(false);
  });

  it('директор и администратор работают во всех разделах', () => {
    expect(canUseSection(director, 'finance')).toBe(true);
    expect(canUseSection(admin, 'finance')).toBe(true);
  });
});

describe('видимость документов', () => {
  const mine = doc({ id: 'd-mine', authorId: employee.id });
  const foreign = doc({ id: 'd-foreign', authorId: other.id });
  const otherCompany = doc({ id: 'd-other-company', companyId: COMPANY_B, authorId: other.id });

  it('работник видит только свои документы', () => {
    const subject = { user: employee, companyId: COMPANY_A };
    expect(canViewDocument(subject, mine)).toBe(true);
    expect(canViewDocument(subject, foreign)).toBe(false);
  });

  it('директор видит все документы своей компании и ни одного чужой', () => {
    const subject = { user: director, companyId: COMPANY_A };
    expect(canViewDocument(subject, foreign)).toBe(true);
    expect(canViewDocument(subject, otherCompany)).toBe(false);
  });

  it('администратор видит документы всех компаний', () => {
    const subject = { user: admin, companyId: COMPANY_A };
    expect(canViewDocument(subject, foreign)).toBe(true);
    expect(canViewDocument(subject, otherCompany)).toBe(true);
  });

  it('удалённый документ пропадает у того, кто не может его вернуть', () => {
    const removed = doc({ id: 'd-removed', authorId: employee.id, deletedAt: '2026-02-01T00:00:00.000Z' });

    expect(canViewDocument({ user: employee, companyId: COMPANY_A }, removed)).toBe(false);
    expect(canViewDocument({ user: director, companyId: COMPANY_A }, removed)).toBe(true);
  });

  it('удалённый документ пропадает из реестра у всех, включая директора («Тест день 2»)', () => {
    const removed = doc({ id: 'd-removed', deletedAt: '2026-02-01T00:00:00.000Z' });
    const all = [mine, removed];

    for (const who of [employee, director, admin]) {
      const ids = visibleDocuments({ user: who, companyId: COMPANY_A }, all).map((d) => d.id);
      expect(ids).not.toContain('d-removed');
    }

    // Корзина админ-панели его видит.
    expect(
      visibleDocuments({ user: admin, companyId: COMPANY_A }, all, { withDeleted: true }).map(
        (d) => d.id,
      ),
    ).toContain('d-removed');
  });

  it('отбор списка повторяет поштучную проверку', () => {
    const all = [mine, foreign, otherCompany];

    expect(visibleDocuments({ user: employee, companyId: COMPANY_A }, all).map((d) => d.id)).toEqual([
      'd-mine',
    ]);
    expect(visibleDocuments({ user: director, companyId: COMPANY_A }, all).map((d) => d.id)).toEqual([
      'd-mine',
      'd-foreign',
    ]);
    expect(visibleDocuments({ user: admin, companyId: COMPANY_A }, all)).toHaveLength(3);
  });
});

describe('правка и удаление', () => {
  it('работник правит только свой черновик, но не свой сохранённый документ', () => {
    const subject = { user: employee, companyId: COMPANY_A };

    expect(canEditDocument(subject, doc({ authorId: employee.id, status: 'draft' }))).toBe(true);
    expect(canEditDocument(subject, doc({ authorId: employee.id, status: 'saved' }))).toBe(false);
  });

  it('директор исправляет ошибку в чужом сохранённом документе своей компании', () => {
    const subject = { user: director, companyId: COMPANY_A };
    expect(canEditDocument(subject, doc({ authorId: other.id, status: 'saved' }))).toBe(true);
  });

  it('удалять могут директор и администратор, работник — нет', () => {
    const own = doc({ authorId: employee.id });

    expect(canDeleteDocument({ user: employee, companyId: COMPANY_A }, own)).toBe(false);
    expect(canDeleteDocument({ user: director, companyId: COMPANY_A }, own)).toBe(true);
    expect(canDeleteDocument({ user: admin, companyId: COMPANY_A }, own)).toBe(true);
  });

  it('удалить дважды нельзя', () => {
    const removed = doc({ deletedAt: '2026-02-01T00:00:00.000Z' });
    expect(canDeleteDocument({ user: director, companyId: COMPANY_A }, removed)).toBe(false);
  });

  it('вернуть удалённый документ могут директор своей компании и администратор', () => {
    const removed = doc({ authorId: employee.id, deletedAt: '2026-02-01T00:00:00.000Z' });
    const foreignRemoved = doc({ companyId: COMPANY_B, deletedAt: '2026-02-01T00:00:00.000Z' });

    expect(canRestoreDocument({ user: employee, companyId: COMPANY_A }, removed)).toBe(false);
    expect(canRestoreDocument({ user: director, companyId: COMPANY_A }, removed)).toBe(true);
    expect(canRestoreDocument({ user: director, companyId: COMPANY_A }, foreignRemoved)).toBe(false);
    expect(canRestoreDocument({ user: admin, companyId: COMPANY_A }, foreignRemoved)).toBe(true);
    // Живой документ возвращать неоткуда.
    expect(canRestoreDocument({ user: admin, companyId: COMPANY_A }, doc())).toBe(false);
  });
});

describe('выданный доступ («Тест день 2»)', () => {
  const grant = (userId: string, level: 'view' | 'edit') => ({
    userId,
    level,
    grantedBy: director.id,
    grantedAt: '2026-09-23T00:00:00.000Z',
  });

  it('работник видит чужой документ, доступ к которому ему выдали', () => {
    const subject = { user: employee, companyId: COMPANY_A };
    const foreign = doc({ authorId: other.id });

    expect(canViewDocument(subject, foreign)).toBe(false);
    expect(canViewDocument(subject, { ...foreign, grants: [grant(employee.id, 'view')] })).toBe(true);
  });

  it('доступ на просмотр не даёт править, доступ на правку – даёт', () => {
    const subject = { user: employee, companyId: COMPANY_A };
    const foreign = doc({ authorId: other.id, status: 'saved' });

    expect(canEditDocument(subject, { ...foreign, grants: [grant(employee.id, 'view')] })).toBe(false);
    expect(canEditDocument(subject, { ...foreign, grants: [grant(employee.id, 'edit')] })).toBe(true);
  });

  it('выданный доступ не открывает документ чужой компании', () => {
    const outsider = user('u-outsider', 'employee', { companyIds: [COMPANY_B] });
    const granted = doc({ authorId: other.id, grants: [grant(outsider.id, 'edit')] });

    expect(canViewDocument({ user: outsider, companyId: COMPANY_B }, granted)).toBe(false);
    expect(canReceiveGrant({ user: director, companyId: COMPANY_A }, granted, outsider)).toBe(false);
  });

  it('открытый раздел показывает сохранённые документы раздела, но не чужие черновики', () => {
    const reader = user('u-reader', 'employee', { viewSectionIds: ['hr'] });
    const subject = { user: reader, companyId: COMPANY_A };

    expect(canViewDocument(subject, doc({ authorId: other.id, status: 'saved' }))).toBe(true);
    expect(canViewDocument(subject, doc({ authorId: other.id, status: 'draft' }))).toBe(false);
    // Раздел по шаблону «legal-…» ему не открыт.
    expect(
      canViewDocument(subject, doc({ authorId: other.id, templateId: 'legal-power-single' })),
    ).toBe(false);
    // Просмотр раздела не даёт права править.
    expect(canEditDocument(subject, doc({ authorId: other.id, status: 'saved' }))).toBe(false);
  });

  it('выдают доступ директор и администратор, работник – нет', () => {
    const own = doc({ authorId: employee.id });

    expect(canGrantDocument({ user: employee, companyId: COMPANY_A }, own)).toBe(false);
    expect(canGrantDocument({ user: director, companyId: COMPANY_A }, own)).toBe(true);
    expect(canGrantDocument({ user: admin, companyId: COMPANY_A }, own)).toBe(true);
  });

  it('раздел документа восстанавливается из шаблона, самый длинный подходящий', () => {
    expect(sectionOfDocument(doc({ templateId: 'hr-hire-order' }))).toBe('hr');
    expect(sectionOfDocument(doc({ templateId: 'procurement-sales-request' }))).toBe(
      'procurement-sales',
    );
    expect(sectionOfDocument(doc({ templateId: 'hr-x', sectionId: 'legal' }))).toBe('legal');
  });
});

describe('директор управляет своей компанией («Тест день 2»)', () => {
  const directorSubject = { user: director, companyId: COMPANY_A };
  const outsider = user('u-outsider', 'employee', { companyIds: [COMPANY_B] });
  const otherDirector = user('u-director-2', 'director');

  it('правит сотрудников своей компании и никого больше', () => {
    expect(canManageUser(directorSubject, employee)).toBe(true);
    expect(canManageUser(directorSubject, outsider)).toBe(false);
    expect(canManageUser(directorSubject, otherDirector)).toBe(false);
    expect(canManageUser(directorSubject, admin)).toBe(false);
    expect(canManageUser(directorSubject, director)).toBe(false);
  });

  it('заводит только сотрудников и только в свои компании', () => {
    expect(assignableRoles(directorSubject)).toEqual(['employee']);
    expect(managedCompanyIds(directorSubject)).toEqual([COMPANY_A]);
    expect(managedCompanyIds({ user: admin, companyId: null })).toBeNull();
    expect(assignableRoles({ user: employee, companyId: COMPANY_A })).toEqual([]);
  });

  it('не видит администраторов и людей чужих компаний', () => {
    expect(canSeeUser(directorSubject, otherDirector)).toBe(true);
    expect(canSeeUser(directorSubject, admin)).toBe(false);
    expect(canSeeUser(directorSubject, outsider)).toBe(false);
  });

  it('видит журнал только своих компаний', () => {
    const entry = (companyId: string) => ({
      id: 'a',
      at: '2026-09-23T00:00:00.000Z',
      userId: 'u',
      userName: 'u',
      companyId,
      event: 'document.create',
      target: 'x',
    });

    expect(canSeeAuditEntry(directorSubject, entry(COMPANY_A))).toBe(true);
    expect(canSeeAuditEntry(directorSubject, entry(COMPANY_B))).toBe(false);
    expect(canSeeAuditEntry(directorSubject, entry(''))).toBe(false);
    expect(canSeeAuditEntry({ user: admin, companyId: null }, entry(''))).toBe(true);
    expect(canSeeAuditEntry({ user: employee, companyId: COMPANY_A }, entry(COMPANY_A))).toBe(false);
  });

  it('админ-панель открыта директору, но без компаний группы и настроек', () => {
    expect(can(directorSubject, 'admin.panel')).toBe(true);
    expect(can(directorSubject, 'company.create')).toBe(false);
    expect(can(directorSubject, 'settings.manage')).toBe(false);
    expect(can({ user: employee, companyId: COMPANY_A }, 'admin.panel')).toBe(false);
  });
});
