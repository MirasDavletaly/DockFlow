/**
 * Хранилище.
 *
 * Два свойства, за которые здесь отвечают: справочник людей у каждой компании
 * свой, и запись, сохранённая прежней версией сайта, читается без «undefined»
 * на экране и без состояний, которых больше нет.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  employeesOf,
  findEmployeeIn,
  isFirstRun,
  loadDb,
  migrateAllowList,
  reloadDb,
  resetDb,
  updateDb,
} from './db';

beforeEach(() => {
  localStorage.clear();
  resetDb();
});

describe('первый запуск', () => {
  it('учётных записей нет: пароля в коде тоже нет ни одного', () => {
    expect(isFirstRun()).toBe(true);
    expect(loadDb().users).toEqual([]);
  });

  it('компании и справочник людей заведены', () => {
    const db = loadDb();
    expect(db.companies.length).toBeGreaterThan(0);
    expect(db.employees.length).toBeGreaterThan(0);
  });
});

describe('справочник людей', () => {
  it('у каждой компании свой: человек одной не попадает в список другой', () => {
    const db = loadDb();
    const [first, second] = db.companies;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    const ofFirst = employeesOf(first.id);
    const ofSecond = employeesOf(second.id);

    expect(ofFirst.length).toBeGreaterThan(0);
    expect(ofFirst.every((e) => e.companyId === first.id)).toBe(true);

    // Идентификаторы не пересекаются: это разные карточки, а не одна на двоих.
    const idsOfSecond = new Set(ofSecond.map((e) => e.id));
    expect(ofFirst.some((e) => idsOfSecond.has(e.id))).toBe(false);
  });

  it('карточку чужой компании по её идентификатору не достать', () => {
    const db = loadDb();
    const [first, second] = db.companies;
    if (first === undefined || second === undefined) return;

    const person = employeesOf(first.id)[0];
    expect(person).toBeDefined();
    if (person === undefined) return;

    expect(findEmployeeIn(first.id, person.id)?.id).toBe(person.id);
    expect(findEmployeeIn(second.id, person.id)).toBeUndefined();
  });
});

describe('чтение старой записи', () => {
  it('состояния, которых больше нет, читаются как «сохранён»', () => {
    // Так выглядела запись до того, как согласование и утверждение убрали.
    localStorage.setItem(
      'docflow.local.db',
      JSON.stringify({
        version: 1,
        documents: [
          { id: 'd-1', templateId: 'hr-hire-order', companyId: 'c-a', title: 'Приказ', status: 'approved', createdAt: '2026-01-01T00:00:00.000Z', values: {} },
          { id: 'd-2', templateId: 'hr-hire-order', companyId: 'c-a', title: 'Приказ', status: 'draft', createdAt: '2026-01-01T00:00:00.000Z', values: {} },
        ],
      }),
    );
    // Хранилище подменено мимо этой вкладки: так же, как если бы запись
    // оставила прежняя версия сайта.
    reloadDb();

    const documents = loadDb().documents;
    expect(documents.map((d) => d.status)).toEqual(['saved', 'draft']);
  });

  it('поля, появившиеся позже, не приходят как undefined', () => {
    localStorage.setItem(
      'docflow.local.db',
      JSON.stringify({
        version: 1,
        documents: [
          { id: 'd-1', templateId: 'hr-hire-order', companyId: 'c-a', title: 'Приказ', status: 'draft', createdAt: '2026-01-01T00:00:00.000Z', values: {} },
        ],
      }),
    );
    reloadDb();

    const doc = loadDb().documents[0];
    expect(doc).toBeDefined();
    if (doc === undefined) return;

    expect(doc.description).toBe('');
    expect(doc.subject).toBe('');
    expect(doc.authorId).toBe('');
    expect(doc.number).toBeNull();
    expect(doc.updatedAt).toBe(doc.createdAt);
  });
});

describe('компания, убранная из группы («удали компанию Nova», 25.09)', () => {
  it('в исходном наборе её нет', () => {
    expect(loadDb().companies.some((c) => c.id === 'c-novalliance')).toBe(false);
  });

  it('из базы прежней версии уходят компания и её люди, документы – в корзину', () => {
    const before = loadDb();
    const [first] = before.companies;
    if (first === undefined) throw new Error('нет компаний');

    localStorage.setItem(
      'docflow.local.db',
      JSON.stringify({
        ...before,
        companies: [...before.companies, { ...first, id: 'c-novalliance', name: 'ТОО NOVALLIANCE' }],
        employees: [
          ...before.employees,
          { id: 'c-novalliance:e-1', companyId: 'c-novalliance', fullName: 'Кто-то', fullNameGenitive: 'Кого-то', position: '', unit: '' },
        ],
        users: [
          { id: 'u-1', login: 'dir', displayName: 'Д', role: 'director', companyIds: ['c-novalliance', first.id], sectionIds: [], createdAt: '2026-01-01T00:00:00.000Z', password: {}, failedAttempts: 0 },
        ],
        documents: [
          { id: 'd-1', templateId: 'hr-hire-order', companyId: 'c-novalliance', title: 'Приказ', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', values: {} },
          { id: 'd-2', templateId: 'hr-hire-order', companyId: first.id, title: 'Приказ', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', values: {} },
        ],
        archive: [
          { id: 'f-1', companyId: 'c-novalliance', title: 'Скан', number: null, documentDate: '2026-01-01', sectionId: 'hr', description: '', fileName: 'a.pdf', size: 1, sha256: 'x', uploadedBy: 'u-1', uploadedByName: 'Д', uploadedAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    );
    reloadDb();

    const db = loadDb();
    expect(db.companies.some((c) => c.id === 'c-novalliance')).toBe(false);
    expect(db.employees.some((e) => e.companyId === 'c-novalliance')).toBe(false);
    expect(db.users[0]?.companyIds).toEqual([first.id]);

    // Документы не стираются молча: они в корзине, откуда их возвращают или
    // удаляют навсегда. Документы других компаний не тронуты.
    expect(db.documents.find((d) => d.id === 'd-1')?.deletedAt).toBeDefined();
    expect(db.documents.find((d) => d.id === 'd-2')?.deletedAt).toBeUndefined();
    expect(db.archive[0]?.deletedAt).toBeDefined();
  });
});

describe('русское написание имён в справочнике («Нұрлан» – «Нурлан»)', () => {
  it('имя с казахскими буквами переходит в казахское поле, русское – русскими буквами', () => {
    const before = loadDb();
    const [first] = before.companies;
    if (first === undefined) throw new Error('нет компаний');

    localStorage.setItem(
      'docflow.local.db',
      JSON.stringify({
        ...before,
        employees: [
          { id: 'e-1', companyId: first.id, fullName: 'Оспанов Нұрлан Ерболатович', fullNameGenitive: 'Оспанова Нұрлана Ерболатовича', position: '', unit: '' },
          { id: 'e-2', companyId: first.id, fullName: 'Серіков Ержан', fullNameGenitive: 'Серікова Ержана', fullNameKk: 'Серіков Ержан Болатұлы', position: '', unit: '' },
        ],
        documents: [
          {
            id: 'd-1', templateId: 'hr-hire-order', companyId: first.id, title: 'Приказ', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', values: { employee: 'e-1' },
            peopleSnapshot: { 'e-1': { id: 'e-1', companyId: first.id, fullName: 'Оспанов Нұрлан Ерболатович', fullNameGenitive: 'Оспанова Нұрлана Ерболатовича', position: '', unit: '' } },
          },
        ],
      }),
    );
    reloadDb();

    const [nurlan, erzhan] = loadDb().employees;
    expect(nurlan?.fullName).toBe('Оспанов Нурлан Ерболатович');
    expect(nurlan?.fullNameGenitive).toBe('Оспанова Нурлана Ерболатовича');
    expect(nurlan?.fullNameKk).toBe('Оспанов Нұрлан Ерболатович');

    // Казахское написание, вписанное руками, не затирается.
    expect(erzhan?.fullName).toBe('Сериков Ержан');
    expect(erzhan?.fullNameKk).toBe('Серіков Ержан Болатұлы');

    // Выпущенный документ не переписывается (CLAUDE.md, п. 3.4).
    expect(loadDb().documents[0]?.peopleSnapshot?.['e-1']?.fullName).toBe(
      'Оспанов Нұрлан Ерболатович',
    );
  });
});

describe('журнал действий', () => {
  it('запись переживает перезагрузку страницы', () => {
    updateDb((db) => ({
      ...db,
      audit: [
        {
          id: 'a-1',
          at: '2026-01-01T00:00:00.000Z',
          userId: 'u-1',
          userName: 'Кто-то',
          companyId: 'c-a',
          event: 'document.create',
          target: 'Приказ',
        },
      ],
    }));

    // resetDb очищает кэш модуля, но не хранилище: имитируем перезагрузку.
    const raw = localStorage.getItem('docflow.local.db');
    expect(raw).not.toBeNull();
    expect(raw).toContain('document.create');
  });
});

describe('список адресов админ-панели («Тест день 2»)', () => {
  it('старый список строк становится адресами без названия', () => {
    expect(migrateAllowList(['203.0.113.7', ' ', '10.0.0.0/8'])).toEqual([
      { ip: '203.0.113.7', name: '' },
      { ip: '10.0.0.0/8', name: '' },
    ]);
  });

  it('новый список с названиями читается как есть, мусор отбрасывается', () => {
    expect(
      migrateAllowList([{ ip: '203.0.113.7', name: 'Офис' }, { name: 'без адреса' }, 42, null]),
    ).toEqual([{ ip: '203.0.113.7', name: 'Офис' }]);
    expect(migrateAllowList(undefined)).toEqual([]);
  });
});
