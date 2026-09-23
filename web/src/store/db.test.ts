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
