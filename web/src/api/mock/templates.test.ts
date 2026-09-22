/**
 * Бланк один на все документы.
 *
 * Просьба была прямая: во всех компаниях, во всех шаблонах и во всех
 * документах оформление должно быть таким же, как в присланном приказе.
 * Этот тест не даёт завести документ мимо бланка – ни сейчас, ни потом,
 * когда шаблонов станет четыреста.
 */
import { describe, expect, it } from 'vitest';

import { ORDER_WORDS, ORDERED_WORDS } from './blank';
import { templates } from './templates';

import type { DocBlock, DocumentTemplate } from '@/api/types';

function kinds(tpl: DocumentTemplate): string[] {
  return tpl.body.map((block: DocBlock) => block.kind);
}

const orders = templates.filter((tpl) => tpl.layout === 'order');
const poa = templates.filter((tpl) => tpl.layout === 'poa');

describe('все документы', () => {
  it('стоят на одном из двух бланков: приказ или доверенность', () => {
    expect(orders.length + poa.length).toBe(templates.length);
    expect(orders.length).toBeGreaterThan(0);
    expect(poa.length).toBeGreaterThan(0);
  });

  it('начинаются с шапки компании', () => {
    for (const tpl of templates) {
      expect(kinds(tpl)[0], tpl.title).toBe('letterhead');
    }
  });

  it('у приказов под шапкой стоит строка «город – дата»', () => {
    // У доверенности её нет: место и дата выдачи стоят внутри её заголовка,
    // как в присланном образце.
    for (const tpl of orders) {
      expect(kinds(tpl)[1], tpl.title).toBe('place-date');
    }
  });

  it('заканчиваются подписью', () => {
    for (const tpl of templates) {
      expect(kinds(tpl), tpl.title).toContain(
        tpl.layout === 'poa' ? 'poa-signature' : 'tri-signature',
      );
    }
  });

  it('помечены как непроверенные юристом', () => {
    // Казахские окончания взяты из образца, а ссылок на статьи у половины
    // документов нет вовсе: до проверки юристом это черновики.
    expect(templates.every((tpl) => !tpl.reviewed)).toBe(true);
  });

  it('объявляют языки, на которых текст действительно написан', () => {
    for (const tpl of templates) {
      expect(tpl.langs.length, tpl.title).toBeGreaterThan(0);
      expect(tpl.langs, tpl.title).toContain('ru');
    }
  });
});

describe('бланк приказа', () => {
  it('везде один и тот же порядок блоков', () => {
    for (const tpl of orders) {
      const order = kinds(tpl).filter((kind) => kind !== 'executor');
      const head = ['letterhead', 'place-date', 'order-title', 'tri-table'];

      expect(order.slice(0, 4), tpl.title).toEqual(head);
      expect(order, tpl.title).toContain('tri-signature');
    }
  });

  it('у приказов есть строка распоряжения и лист ознакомления', () => {
    // Справка не приказывает и никого не знакомит под подпись – у неё их нет.
    for (const tpl of orders) {
      const order = kinds(tpl);
      const isOrder = tpl.title.startsWith('Приказ');
      expect(order.includes('tri-line'), tpl.title).toBe(isOrder);
      expect(order.includes('tri-acquaint'), tpl.title).toBe(isOrder);
    }
  });

  it('заголовок и строка распоряжения взяты из образца', () => {
    for (const tpl of orders) {
      for (const block of tpl.body) {
        if (block.kind === 'order-title' && tpl.title.startsWith('Приказ')) {
          expect(block.words, tpl.title).toEqual(ORDER_WORDS);
        }
        if (block.kind === 'tri-line') {
          expect(block.words, tpl.title).toEqual(ORDERED_WORDS);
        }
      }
    }
  });

  it('тема приказа набрана полужирным', () => {
    // У справки темы нет: её название стоит прямо в заголовке, как «СПРАВКА».
    for (const tpl of orders.filter((tpl) => tpl.title.startsWith('Приказ'))) {
      const first = tpl.body.find((block) => block.kind === 'tri-table');
      expect(first, tpl.title).toBeDefined();
      if (first?.kind !== 'tri-table') continue;

      const subject = first.rows[0]?.ru?.[0];
      expect(subject, tpl.title).toBeDefined();
      expect(subject?.some((run) => run.bold === true), tpl.title).toBe(true);
    }
  });
});

describe('колонки', () => {
  it('у пяти документов тело в трёх языках, у остальных пока в одном', () => {
    const three = templates.filter((tpl) => tpl.langs.length === 3);
    const one = templates.filter((tpl) => tpl.langs.length === 1);

    expect(three.map((tpl) => tpl.id).sort()).toEqual([
      'corporate-director-appointment',
      'hr-hire-order',
      'hr-unpaid-leave-order',
      'hr-vacation-order',
    ]);
    // Доверенность на двух языках, поэтому в три не попадает.
    expect(one.length).toBe(templates.length - three.length - poa.length);
  });

  it('в каждой строке таблицы заполнены ровно объявленные языки', () => {
    for (const tpl of orders) {
      for (const block of tpl.body) {
        if (block.kind !== 'tri-table') continue;
        for (const row of block.rows) {
          for (const lang of tpl.langs) {
            expect(row[lang], `${tpl.title}: ${lang}`).toBeDefined();
          }
        }
      }
    }
  });
});
