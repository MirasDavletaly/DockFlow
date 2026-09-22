/**
 * Бланк приказа и доверенности.
 *
 * Проверяется то, ради чего бланк переделывали: приказ выходит в трёх
 * колонках с настоящими ссылками на Трудовой кодекс, ФИО в каждой колонке
 * стоит в своём падеже, а непереведённая должность не оставляет в документе
 * пустого места.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { blankTemplates } from '@/api/mock/templates-blank';
import { DocumentSheet } from './DocumentSheet';
import { resetDb, updateDb } from '@/store/db';

import type { Company, EmployeeBrief } from '@/api/types';
import type { Root } from 'react-dom/client';

const company: Company = {
  id: 'c-test',
  name: 'ТОО «GREEN SPARK LIMITED»',
  legalName: 'Товарищество с ограниченной ответственностью «GREEN SPARK LIMITED»',
  legalNameKk: 'ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «GREEN SPARK LIMITED»',
  legalNameEn: 'GREEN SPARK LIMITED LLP',
  bin: '170340025267',
  address: 'ЗКО, город Аксай, промышленная зона, здание 225H',
  directorName: 'Кабешова Самал Амангелдиевна',
  directorNameEn: 'Samal Kabeshova',
  directorTitle: 'Генеральный директор',
  directorTitleKk: 'Бас Директоры',
  directorTitleEn: 'General Director',
  directorTitleGenitive: 'Генерального директора',
  directorNameGenitive: 'Кабешовой Самал Амангелдиевны',
  directorBasis: 'Устава',
  city: 'Аксай',
  cityKk: 'Ақсай',
  cityEn: 'Aksai',
  accent: '#2f6b55',
  monogram: 'GS',
};

/** Работник с заполненными формами имени – как их вводят в админ-панели. */
const translated: EmployeeBrief = {
  id: 'c-test:e-1',
  companyId: 'c-test',
  fullName: 'Нуржанов Диас Жанболатович',
  fullNameGenitive: 'Нуржанову Диасу Жанболатовичу',
  fullNameKk: 'Нуржанов Диас Жанболатұлы',
  fullNameKkDative: 'Нуржанов Диас Жанболатовичке',
  fullNameEn: 'Dias Nurzhanov',
  position: 'Младший инженер-конструктор',
  unit: 'Проектный отдел',
};

/** Работник без переводов: так выглядит карточка сразу после заведения. */
const untranslated: EmployeeBrief = {
  id: 'c-test:e-2',
  companyId: 'c-test',
  fullName: 'Ким Ирина Сергеевна',
  fullNameGenitive: 'Ким Ирину Сергеевну',
  position: 'Бухгалтер',
  unit: 'Бухгалтерия',
};

function template(id: string) {
  const found = blankTemplates.find((tpl) => tpl.id === id);
  if (found === undefined) throw new Error(`шаблон ${id} не найден`);
  return found;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  resetDb();
  updateDb((db) => ({ ...db, employees: [translated, untranslated] }));

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

describe('шапка бланка', () => {
  it('наименование стоит на трёх языках, казахское первым', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={company}
        date="2026-09-22"
      />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «GREEN SPARK LIMITED»');
    expect(text).toContain('Товарищество с ограниченной ответственностью «GREEN SPARK LIMITED»');
    expect(text).toContain('GREEN SPARK LIMITED LLP');

    expect(text.indexOf('ЖАУАПКЕРШІЛІГІ')).toBeLessThan(text.indexOf('Товарищество'));
  });

  it('город печатается на трёх языках, а без переводов – только по-русски', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={company}
        date="2026-09-22"
      />,
    );
    expect(container.textContent).toContain('Ақсай қ. / г. Аксай / Aksai city');

    const { cityKk: _kk, cityEn: _en, ...plain } = company;
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={plain}
        date="2026-09-22"
      />,
    );
    expect(container.textContent).toContain('г. Аксай');
    expect(container.textContent).not.toContain('Aksai city');
  });
});

describe('приказ о приёме на работу', () => {
  const values = {
    employee: translated.id,
    position: 'Младший инженер-конструктор',
    positionKk: 'Кіші жобалаушы инженер',
    positionEn: 'Junior Design Engineer',
    startDate: '2026-10-01',
    contractNumber: '004-2026/GS',
    contractDate: '2026-09-20',
  };

  it('ссылается на ту же статью, что и ваш приказ', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={values}
        company={company}
        date="2026-09-22"
      />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('34-бабына сәйкес');
    expect(text).toContain('статьей 34 Трудового Кодекса РК от 23 ноября 2015 г. № 414-V');
    expect(text).toContain('Article 34 of the Labor Code');
  });

  it('ФИО в каждой колонке стоит в своей форме', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={values}
        company={company}
        date="2026-09-22"
      />,
    );

    const text = container.textContent ?? '';
    // Казахская колонка: подлежащее, именительный падеж.
    expect(text).toContain('Нуржанов Диас Жанболатұлы');
    // Русская: после «Принять» – винительный.
    expect(text).toContain('Принять Нуржанову Диасу Жанболатовичу');
    // Английская: латиница.
    expect(text).toContain('Dias Nurzhanov');
  });

  it('должность без перевода не оставляет пустого места в колонке', () => {
    const { positionKk: _kk, positionEn: _en, ...noTranslation } = values;

    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={noTranslation}
        company={company}
        date="2026-09-22"
      />,
    );

    // Русское название встречается трижды: по разу в каждой колонке.
    const matches = (container.textContent ?? '').match(/Младший инженер-конструктор/g) ?? [];
    expect(matches).toHaveLength(3);
  });

  it('у работника без переводов во всех колонках стоит то, что есть', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{ ...values, employee: untranslated.id }}
        company={company}
        date="2026-09-22"
      />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Ким Ирина Сергеевна');
    expect(text).toContain('Принять Ким Ирину Сергеевну');
    expect(text).not.toContain(untranslated.id);
  });
});

describe('номер приказа', () => {
  it('стоит в заголовке рядом со словом ПРИКАЗ', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={company}
        date="2026-09-22"
        number="99-26-ЛС"
      />,
    );

    const title = container.querySelector('h1');
    expect(title?.textContent).toContain('Б Ұ Й Р Ы Қ');
    expect(title?.textContent).toContain('ПРИКАЗ');
    expect(title?.textContent).toContain('ORDER');
    expect(title?.textContent).toContain('99-26-ЛС');
  });
});

describe('доверенность', () => {
  it('выходит на двух языках: казахской колонки в ваших доверенностях нет', () => {
    const poa = template('legal-power-single');
    expect(poa.langs).toEqual(['ru', 'en']);

    render(
      <DocumentSheet
        template={poa}
        values={{
          employee: translated.id,
          birthDate: '2003-06-17',
          iin: '030617500548',
          idNumber: '046391444',
          idDate: '2019-08-15',
          idIssuer: 'МВД Республики Казахстан',
          address: 'г. Астана, ул. Абикен Бектуров 7, кв. 160',
          powers: 'подписывать накладные и акты выполненных работ',
          until: '2026-12-31',
        }}
        company={company}
        date="2026-09-22"
      />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Доверенность');
    expect(text).toContain('Power of Attorney');
    expect(text).toContain('БИН 170340025267');
    expect(text).toContain('подписывать накладные и акты выполненных работ');
    // Английская колонка без своего перевода полномочий повторяет русский текст,
    // а не остаётся пустой.
    expect(text).toContain('BIN 170340025267');
  });
});

describe('все бланки', () => {
  it('помечены как непроверенные юристом', () => {
    // Казахские падежные окончания в них взяты из образца и при других датах
    // будут неверными: пока юрист не проверил, документ – черновик.
    expect(blankTemplates.every((tpl) => !tpl.reviewed)).toBe(true);
  });

  it('приказы объявляют три языка, доверенность – два', () => {
    for (const tpl of blankTemplates) {
      if (tpl.layout === 'order') expect(tpl.langs).toEqual(['kk', 'ru', 'en']);
      if (tpl.layout === 'poa') expect(tpl.langs).toEqual(['ru', 'en']);
    }
  });
});
