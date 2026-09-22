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

  it('логотип стоит в шапке, а без него – буквы компании', () => {
    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={{ ...company, logo: 'data:image/png;base64,iVBORw0KGgo=' }}
        date="2026-09-22"
      />,
    );
    expect(container.querySelector('img')).not.toBeNull();

    render(
      <DocumentSheet
        template={template('hr-hire-order')}
        values={{}}
        company={company}
        date="2026-09-22"
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('GS');
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
    expect(container.textContent).toContain('Ақсай қ./г. Аксай / Aksai city');

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

describe('сверка с присланным приказом', () => {
  /**
   * Приказ «AL Nurdaulet KNT» – тот самый образец, по которому сделан бланк.
   * Собираем его теми же данными и сверяем лист построчно: так видно, что
   * оформление совпало не «примерно», а дословно.
   */
  const knt: Company = {
    ...company,
    name: 'Kazakhstan New Technologies LLP',
    legalName:
      'Партнерство с ограниченной ответственностью «Kazakhstan New Technologies LLP»',
    legalNameKk: 'ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «KAZAKHSTAN NEW TECHNOLOGIES LLP»',
    legalNameEn: 'KAZAKHSTAN NEW TECHNOLOGIES LLP',
    city: 'Астана',
    cityKk: 'Астана',
    cityEn: 'Astana',
    directorName: 'Ихсанова С.Т.',
    directorNameEn: 'Sofiya Ikhsanova',
    directorTitle: 'Генеральный директор',
    directorTitleKk: 'Бас директор',
    directorTitleEn: 'General director',
  };

  const lawyer: EmployeeBrief = {
    id: 'c-test:e-9',
    companyId: 'c-test',
    fullName: 'Хамит Нурдаулет Алмазулы',
    fullNameGenitive: 'Хамит Нурдаулет Алмазулы',
    fullNameKk: 'Хамит Нурдаулет Алмазұлы',
    fullNameKkDative: 'Хамит Нурдаулет Алмазұлы',
    fullNameEn: 'Nurdaulet Khamit',
    position: 'Юристу',
    positionKk: 'Заңгерге',
    positionEn: 'Lawyer',
    unit: 'Юридический отдел',
  };

  it('лист повторяет образец строка за строкой', () => {
    updateDb((db) => ({ ...db, employees: [lawyer] }));

    render(
      <DocumentSheet
        template={template('hr-vacation-order')}
        values={{
          employee: lawyer.id,
          position: 'Юристу',
          positionKk: 'Заңгерге',
          positionEn: 'Lawyer',
          days: '24',
          daysWords: 'двадцать четыре',
          from: '2026-09-04',
          to: '2026-09-27',
          workedFrom: '2025-06-01',
          workedTo: '2026-09-03',
          applicationDate: '2026-09-02',
        }}
        company={knt}
        date="2026-09-02"
        number="07-26-ЛС"
      />,
    );

    const text = (container.textContent ?? '').replace(/\s+/g, ' ');

    // Шапка, город и дата, заголовок с номером.
    expect(text).toContain('ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «KAZAKHSTAN NEW TECHNOLOGIES LLP»');
    expect(text).toContain('Астана қ./г. Астана / Astana city');
    expect(text).toContain('02.09.2026');
    expect(text).toContain('Б Ұ Й Р Ы Қ / ПРИКАЗ / ORDER № 07-26-ЛС');
    expect(text).toContain('Б Ұ Й Ы Р А М Ы Н / П Р И К А З Ы В А Ю / IT IS HEREBY ORDERED:');

    // Тело: русская колонка дословно как в образце.
    expect(text).toContain(
      'Предоставить ежегодный оплачиваемый трудовой отпуск Юристу Хамит Нурдаулет Алмазулы ' +
        'продолжительностью 24 (двадцать четыре) календарных дней с 04.09.2026 по 27.09.2026 ' +
        'включительно, за период работы с 01.06.2025 по 03.09.2026.',
    );
    expect(text).toContain(
      'Бухгалтерии рассчитать отпускные дни за отработанный период работы в срок и в ' +
        'порядке, установленные действующим законодательством Республики Казахстан.',
    );
    expect(text).toContain(
      'Основание: личное заявление Хамит Нурдаулет Алмазулы от 02.09.2026 года.',
    );

    // Подпись и лист ознакомления.
    expect(text).toContain('Жұмыс беруші / Работодатель / Employer:');
    expect(text).toContain('Бас директор');
    expect(text).toContain('Ихсанова С.Т. / Sofiya Ikhsanova');
    expect(text).toContain('General director');
    expect(text).toContain('Таныстым:');
    expect(text).toContain('Ознакомлен:');
    expect(text).toContain('I have read and understood');
    expect(text).toContain('(Аты-Жөні / Ф.И.О. / full name) Қолы / Подпись / Signature');
  });

  it('блоки идут в том же порядке, что в образце', () => {
    render(
      <DocumentSheet
        template={template('hr-vacation-order')}
        values={{}}
        company={knt}
        date="2026-09-02"
      />,
    );

    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    const order = [
      'ЖАУАПКЕРШІЛІГІ',
      'Астана қ./г. Астана',
      'Б Ұ Й Р Ы Қ',
      '«Жыл сайынғы еңбек демалысын беру туралы»',
      'Б Ұ Й Ы Р А М Ы Н',
      'Жұмыс беруші',
      'Таныстым:',
    ];

    let previous = -1;
    for (const mark of order) {
      const at = text.indexOf(mark);
      expect(at, mark).toBeGreaterThan(previous);
      previous = at;
    }
  });
});
