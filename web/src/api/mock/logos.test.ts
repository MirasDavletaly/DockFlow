/**
 * Логотипы компаний.
 *
 * Проверяется то, что легко перепутать и трудно заметить: логотип есть у
 * каждой компании, и он у каждой свой. Чужой логотип в шапке приказа – это
 * документ, выпущенный от имени не той компании.
 */
import { describe, expect, it } from 'vitest';

import { companies } from './companies';
import { loadDb, reloadDb, resetDb, updateDb } from '@/store/db';

describe('логотипы компаний', () => {
  it('есть у каждой компании', () => {
    for (const company of companies) {
      expect(company.logo, company.name).toBeDefined();
    }
  });

  it('у каждой компании свой', () => {
    const logos = companies.map((c) => c.logo);
    expect(new Set(logos).size).toBe(companies.length);
  });

  it('семь компаний идут в том же порядке, в каком присланы логотипы', () => {
    expect(companies.map((c) => c.id)).toEqual([
      'c-exlumen',
      'c-knt',
      'c-algoritmi',
      'c-novalliance',
      'c-greenspark-power',
      'c-greensparklimited',
      'c-effegi',
    ]);
  });
});

describe('база, записанная до появления логотипов', () => {
  it('получает логотип при чтении', () => {
    localStorage.clear();
    resetDb();

    // Кладём в хранилище прежнюю запись: компании те же, но без логотипов.
    // Пишем прямо в localStorage, а не через saveDb: saveDb заполняет кэш, и
    // чтение вернуло бы записанное, не пройдя приведение к текущему виду.
    const before = loadDb();
    localStorage.setItem(
      'docflow.local.db',
      JSON.stringify({
        ...before,
        companies: before.companies.map(({ logo: _logo, ...rest }) => rest),
      }),
    );

    // Так базу читает вкладка, открытая после обновления сайта.
    reloadDb();

    const companiesAfter = loadDb().companies;
    expect(companiesAfter).toHaveLength(before.companies.length);
    for (const company of companiesAfter) {
      expect(company.logo, company.name).toBeDefined();
    }
  });

  it('свой загруженный логотип не затирается', () => {
    localStorage.clear();
    resetDb();

    const own = 'data:image/png;base64,iVBORw0KGgo=';
    updateDb((db) => ({
      ...db,
      companies: db.companies.map((c, i) => (i === 0 ? { ...c, logo: own } : c)),
    }));

    expect(loadDb().companies[0]?.logo).toBe(own);
  });
});
