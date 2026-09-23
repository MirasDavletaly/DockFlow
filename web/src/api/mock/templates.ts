/**
 * Шаблоны документов.
 *
 * Шаблон описывает две вещи сразу: какие поля показать в форме и как из них
 * собирается лист. Это та же пара, что в каталоге — `fields.yaml` рядом с
 * `template.ru.docx`, — только здесь она в одном объекте.
 *
 * ТЕКСТ ДОКУМЕНТОВ — ЧЕРНОВИК, ПРОВЕРИТЬ ЮРИСТУ. Формулировки взяты по смыслу
 * из практики кадрового делопроизводства, ссылок на статьи закона в них нет
 * намеренно: реквизиты норм права не выдумываются (CLAUDE.md, п. 4.9).
 *
 * Поля, начинающиеся с «@», подставляются системой, а не человеком:
 * реквизиты компании, руководитель, город, дата и номер документа.
 */
import { DOCUMENT_WORDS, documentBody, orderBody } from '@/api/mock/blank';
import { blankTemplates } from '@/api/mock/templates-blank';

import type { CatalogEntry, DocumentTemplate } from '@/api/types';

/**
 * Шаблоны на простом одноязычном листе.
 *
 * Документы, для которых ещё нет проверенного казахского и английского
 * текста. Как только перевод придёт, они переезжают в `templates-blank.ts`
 * на настоящий бланк группы – тот же, что у приказа о приёме на работу.
 */
const simpleTemplates: DocumentTemplate[] = [
  {
    id: 'hr-trip-order',
    title: 'Приказ о направлении в командировку',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Служебная поездка работника с выдачей аванса на расходы.',
    reviewed: false,
    layout: 'order',
    // Казахский и английский текст написан по образцу присланных приказов
    // теми же оборотами. Ссылки на статью закона здесь нет: для этого
    // документа она не прислана, а нормы права не выдумываются.
    langs: ['kk', 'ru', 'en'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      { id: 'city', kind: 'text', label: 'Город назначения', required: true, group: 'Командировка' },
      {
        id: 'organization',
        kind: 'text',
        label: 'Принимающая организация',
        required: true,
        group: 'Командировка',
      },
      {
        id: 'purpose',
        kind: 'textarea',
        label: 'Цель командировки',
        required: true,
        group: 'Командировка',
        hint: 'Одной фразой: что именно нужно сделать',
      },
      { id: 'days', kind: 'number', label: 'Срок', required: true, unit: 'кал. дней', group: 'Сроки' },
      {
        id: 'daysWords',
        kind: 'text',
        label: 'Срок прописью',
        required: true,
        group: 'Сроки',
        hint: 'Как в приказе: пять, двенадцать',
        perLang: true,
      },
      {
        id: 'from',
        kind: 'date',
        label: 'Дата выезда',
        required: true,
        group: 'Сроки',
        dateLimits: { notBefore: 'today' },
      },
      {
        id: 'to',
        kind: 'date',
        label: 'Дата возвращения',
        required: true,
        group: 'Сроки',
        // Вернуться раньше, чем выехал, нельзя. Проверка стоит и в органе
        // ввода, и при сохранении: дату можно вписать руками.
        dateLimits: { afterField: 'from' },
      },
    ],
    body: orderBody({
      subject: {
        kk: [[{ text: '«Іссапарға жіберу туралы»', bold: true }]],
        ru: [[{ text: '«О направлении в командировку»', bold: true }]],
        en: [[{ text: '“On business trip assignment”', bold: true }]],
      },
      body: {
        kk: [
          [
            { text: '1. ' },
            { field: 'employee:nom', bold: true },
            { text: ' ' },
            { field: 'position' },
            { text: ' ' },
            { field: 'from' },
            { text: ' бастап ' },
            { field: 'to' },
            { text: ' қоса алғанда ' },
            { field: 'days' },
            { text: ' (' },
            { field: 'daysWords' },
            { text: ') күнтізбелік күн мерзімге ' },
            { field: 'city' },
            { text: ' қаласына, ' },
            { field: 'organization' },
            { text: ', іссапарға жіберілсін.' },
          ],
          [{ text: '2. Іссапардың мақсаты: ' }, { field: 'purpose' }, { text: '.' }],
          [{ text: '3. Бухгалтерия іссапар шығыстарына аванс шығу күніне дейін берсін.' }],
          [
            {
              text:
                '4. Қызметкер оралғаннан кейін белгіленген мерзімде аванстық есеп ' +
                'тапсырсын.',
            },
          ],
          [
            { text: 'Негіздеме: ', bold: true },
            { text: 'бөлім басшысының қызметтік жазбасы.' },
          ],
        ],
        ru: [
          [
            { text: '1. Направить ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', в командировку в г. ' },
            { field: 'city' },
            { text: ', ' },
            { field: 'organization' },
            { text: ', сроком на ' },
            { field: 'days' },
            { text: ' (' },
            { field: 'daysWords' },
            { text: ') календарных дней с ' },
            { field: 'from' },
            { text: ' по ' },
            { field: 'to' },
            { text: '.' },
          ],
          [{ text: '2. Цель командировки: ' }, { field: 'purpose' }, { text: '.' }],
          [{ text: '3. Бухгалтерии выдать аванс на командировочные расходы до даты выезда.' }],
          [
            {
              text:
                '4. Работнику представить авансовый отчёт в установленный срок после ' +
                'возвращения.',
            },
          ],
          [
            { text: 'Основание: ', bold: true },
            { text: 'служебная записка руководителя подразделения.' },
          ],
        ],
        en: [
          [
            { text: '1. To send ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', on a business trip to ' },
            { field: 'city' },
            { text: ', ' },
            { field: 'organization' },
            { text: ', for ' },
            { field: 'days' },
            { text: ' (' },
            { field: 'daysWords' },
            { text: ') calendar days from ' },
            { field: 'from' },
            { text: ' to ' },
            { field: 'to' },
            { text: '.' },
          ],
          [{ text: '2. Purpose of the trip: ' }, { field: 'purpose' }, { text: '.' }],
          [
            {
              text:
                '3. To Accountant Department – to issue an advance for travel expenses ' +
                'before the departure date.',
            },
          ],
          [
            {
              text:
                '4. The employee shall submit an expense report within the established ' +
                'period after return.',
            },
          ],
          [
            { text: 'Basis: ', bold: true },
            { text: 'memorandum of the head of the department.' },
          ],
        ],
      },
    }),
  },

  {
    id: 'hr-transfer-order',
    title: 'Приказ о переводе на другую должность',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Перевод работника на другую должность или в другое подразделение.',
    reviewed: false,
    layout: 'order',
    // Казахский и английский текст написан по образцу присланных приказов
    // теми же оборотами. Ссылки на статью закона здесь нет: для этого
    // документа она не прислана, а нормы права не выдумываются.
    langs: ['kk', 'ru', 'en'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      {
        id: 'positionFrom',
        kind: 'text',
        label: 'Прежняя должность',
        required: true,
        group: 'Работник',
        hint: 'Подставится из справочника',
      },
      { id: 'position', kind: 'text', label: 'Новая должность', required: true, group: 'Перевод' },
      { id: 'unit', kind: 'text', label: 'Новое подразделение', required: true, group: 'Перевод' },
      {
        id: 'transferDate',
        kind: 'date',
        label: 'Дата перевода',
        required: true,
        group: 'Перевод',
        dateLimits: { notBefore: 'today' },
      },
      {
        id: 'salary',
        kind: 'money',
        label: 'Должностной оклад',
        required: true,
        unit: '₸',
        group: 'Перевод',
        hint: 'В месяц, до удержаний',
      },
      {
        id: 'agreementNumber',
        kind: 'text',
        label: 'Номер дополнительного соглашения',
        required: true,
        group: 'Основание',
      },
      {
        id: 'agreementDate',
        kind: 'date',
        label: 'Дата дополнительного соглашения',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
    ],
    body: orderBody({
      subject: {
        kk: [[{ text: '«Басқа лауазымға ауыстыру туралы»', bold: true }]],
        ru: [[{ text: '«О переводе на другую должность»', bold: true }]],
        en: [[{ text: '“On transfer to another position”', bold: true }]],
      },
      body: {
        kk: [
          [
            { text: '1. ' },
            { field: 'employee:nom', bold: true },
            { text: ' ' },
            { field: 'transferDate' },
            { text: ' бастап «' },
            { field: 'positionFrom' },
            { text: '» лауазымынан «' },
            { field: 'position' },
            { text: '» лауазымына «' },
            { field: 'unit' },
            { text: '» бөліміне ауыстырылсын.' },
          ],
          [
            { text: '2. Ауыстырылған күннен бастап айына ' },
            { field: 'salary' },
            { text: ' теңге лауазымдық жалақы белгіленсін.' },
          ],
          [
            {
              text:
                '3. Кадр бөлімі ауыстыру туралы жазбаны еңбек кітапшасына және жеке ' +
                'карточкасына енгізсін, бухгалтерия жаңа жалақы бойынша есептесін.',
            },
          ],
          [
            { text: 'Негіздеме: ', bold: true },
            { field: 'agreementDate' },
            { text: ' жылғы № ' },
            { field: 'agreementNumber' },
            { text: ' еңбек шартына қосымша келісім.' },
          ],
        ],
        ru: [
          [
            { text: '1. Перевести ' },
            { field: 'employee', bold: true },
            { text: ' с должности «' },
            { field: 'positionFrom' },
            { text: '» на должность «' },
            { field: 'position' },
            { text: '» в подразделение «' },
            { field: 'unit' },
            { text: '» с ' },
            { field: 'transferDate' },
            { text: '.' },
          ],
          [
            { text: '2. Установить должностной оклад в размере ' },
            { field: 'salary' },
            { text: ' тенге в месяц с даты перевода.' },
          ],
          [
            {
              text:
                '3. Отделу кадров внести запись о переводе в трудовую книжку и личную ' +
                'карточку работника, бухгалтерии – производить начисление по новому окладу.',
            },
          ],
          [
            { text: 'Основание: ', bold: true },
            { text: 'дополнительное соглашение к трудовому договору от ' },
            { field: 'agreementDate' },
            { text: ' № ' },
            { field: 'agreementNumber' },
            { text: '.' },
          ],
        ],
        en: [
          [
            { text: '1. To transfer ' },
            { field: 'employee', bold: true },
            { text: ' from the position of “' },
            { field: 'positionFrom' },
            { text: '” to the position of “' },
            { field: 'position' },
            { text: '” in the “' },
            { field: 'unit' },
            { text: '” unit from ' },
            { field: 'transferDate' },
            { text: '.' },
          ],
          [
            { text: '2. To set the official salary of ' },
            { field: 'salary' },
            { text: ' tenge per month from the date of transfer.' },
          ],
          [
            {
              text:
                '3. To HR Department – to enter the transfer record in the employment ' +
                'record book and the personal card of the employee; to Accountant ' +
                'Department – to calculate payments at the new salary.',
            },
          ],
          [
            { text: 'Basis: ', bold: true },
            { text: 'supplementary agreement to the employment contract dated ' },
            { field: 'agreementDate' },
            { text: ' No. ' },
            { field: 'agreementNumber' },
            { text: '.' },
          ],
        ],
      },
    }),
  },

  {
    id: 'hr-salary-order',
    title: 'Приказ об изменении оклада',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    // Оклад – узкий круг: приказ виден не всем, у кого есть доступ к кадрам
    // (catalog/profiles.yaml, профиль sensitive).
    profile: 'sensitive',
    purpose: 'Изменение должностного оклада работника с определённой даты.',
    reviewed: false,
    layout: 'order',
    // Казахский и английский текст написан по образцу присланных приказов
    // теми же оборотами. Ссылки на статью закона здесь нет: для этого
    // документа она не прислана, а нормы права не выдумываются.
    langs: ['kk', 'ru', 'en'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      {
        id: 'salary',
        kind: 'money',
        label: 'Новый оклад',
        required: true,
        unit: '₸',
        group: 'Оклад',
        hint: 'В месяц, до удержаний',
      },
      {
        id: 'fromDate',
        kind: 'date',
        label: 'Применяется с',
        required: true,
        group: 'Оклад',
        dateLimits: { notBefore: 'today' },
      },
      {
        id: 'agreementNumber',
        kind: 'text',
        label: 'Номер дополнительного соглашения',
        required: true,
        group: 'Основание',
      },
      {
        id: 'agreementDate',
        kind: 'date',
        label: 'Дата дополнительного соглашения',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
    ],
    body: orderBody({
      subject: {
        kk: [[{ text: '«Лауазымдық жалақыны өзгерту туралы»', bold: true }]],
        ru: [[{ text: '«Об изменении должностного оклада»', bold: true }]],
        en: [[{ text: '“On change of the official salary”', bold: true }]],
      },
      body: {
        kk: [
          [
            { text: '1. ' },
            { field: 'employee:nom', bold: true },
            { text: ' ' },
            { field: 'position' },
            { text: ' ' },
            { field: 'fromDate' },
            { text: ' бастап айына ' },
            { field: 'salary' },
            { text: ' теңге лауазымдық жалақы белгіленсін.' },
          ],
          [{ text: '2. Бухгалтерия осы бұйрықты ескере отырып жалақы есептесін.' }],
          [
            {
              text:
                '3. Кадр бөлімі штат кестесіне және қызметкердің жеке карточкасына ' +
                'өзгеріс енгізсін.',
            },
          ],
          [
            { text: 'Негіздеме: ', bold: true },
            { field: 'agreementDate' },
            { text: ' жылғы № ' },
            { field: 'agreementNumber' },
            { text: ' еңбек шартына қосымша келісім.' },
          ],
        ],
        ru: [
          [
            { text: '1. Установить ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', должностной оклад в размере ' },
            { field: 'salary' },
            { text: ' тенге в месяц с ' },
            { field: 'fromDate' },
            { text: '.' },
          ],
          [
            {
              text:
                '2. Бухгалтерии производить начисление заработной платы с учётом ' +
                'настоящего приказа.',
            },
          ],
          [
            {
              text:
                '3. Отделу кадров внести изменение в штатное расписание и личную ' +
                'карточку работника.',
            },
          ],
          [
            { text: 'Основание: ', bold: true },
            { text: 'дополнительное соглашение к трудовому договору от ' },
            { field: 'agreementDate' },
            { text: ' № ' },
            { field: 'agreementNumber' },
            { text: '.' },
          ],
        ],
        en: [
          [
            { text: '1. To set for ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', the official salary of ' },
            { field: 'salary' },
            { text: ' tenge per month from ' },
            { field: 'fromDate' },
            { text: '.' },
          ],
          [
            {
              text:
                '2. To Accountant Department – to calculate wages taking this order ' +
                'into account.',
            },
          ],
          [
            {
              text:
                '3. To HR Department – to amend the staffing table and the personal ' +
                'card of the employee.',
            },
          ],
          [
            { text: 'Basis: ', bold: true },
            { text: 'supplementary agreement to the employment contract dated ' },
            { field: 'agreementDate' },
            { text: ' No. ' },
            { field: 'agreementNumber' },
            { text: '.' },
          ],
        ],
      },
    }),
  },

  {
    id: 'hr-dismissal-order',
    title: 'Приказ о расторжении трудового договора',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Прекращение трудовых отношений с работником и окончательный расчёт.',
    reviewed: false,
    // Бланк тот же, что у остальных документов, но тело выходит в одну
    // колонку: проверенного казахского и английского текста ещё нет.
    // Список фраз для переводчика – docs/translation-request.md.
    layout: 'order',
    langs: ['ru'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      { id: 'unit', kind: 'text', label: 'Подразделение', required: true, group: 'Работник' },
      {
        id: 'dismissDate',
        kind: 'date',
        label: 'Последний рабочий день',
        required: true,
        group: 'Расторжение',
        dateLimits: { notBefore: 'today' },
        hint: 'День увольнения – последний день работы',
      },
      {
        // Статья закона в текст не подставляется: реквизиты норм права
        // не выдумываются (CLAUDE.md, п. 4.9). Норму вписывает юрист.
        id: 'reason',
        kind: 'select',
        label: 'Основание расторжения',
        required: true,
        group: 'Расторжение',
        options: [
          'по соглашению сторон',
          'по инициативе работника',
          'по истечении срока трудового договора',
          'по инициативе работодателя',
        ],
      },
      {
        id: 'compensationDays',
        kind: 'number',
        label: 'Компенсация за неиспользованный отпуск',
        required: true,
        unit: 'кал. дней',
        group: 'Расчёт',
        hint: 'Ноль, если отпуск использован полностью',
      },
      {
        id: 'contractNumber',
        kind: 'text',
        label: 'Номер трудового договора',
        required: true,
        group: 'Основание',
      },
      {
        id: 'contractDate',
        kind: 'date',
        label: 'Дата трудового договора',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
    ],
    body: orderBody({
      subject: { ru: [[{ text: 'О расторжении трудового договора', bold: true }]] },
      body: {
        ru: [
          [
                      { text: 'Расторгнуть трудовой договор с ' },
                      { field: 'employee' },
                      { text: ', ' },
                      { field: 'position' },
                      { text: ' подразделения «' },
                      { field: 'unit' },
                      { text: '», ' },
                      { field: 'reason' },
                      { text: '. Последний рабочий день – ' },
                      { field: 'dismissDate' },
                      { text: '.' },
                    ],
                    [
                      { text: 'Бухгалтерии произвести окончательный расчёт, включая компенсацию за ' },
                      { field: 'compensationDays' },
                      { text: ' календарных дней неиспользованного трудового отпуска.' },
                    ],
                    [
                      {
                        text:
                          'Отделу кадров выдать работнику трудовую книжку и справку о заработной плате ' +
                          'в день увольнения.',
                      },
                    ],
          [{ text: 'Основание: ', bold: true }, { text: 'трудовой договор от ' },
                    { field: 'contractDate' },
                    { text: ' № ' },
                    { field: 'contractNumber' }]
        ],
      },
    }),
  },

  {
    id: 'hr-vacation-recall-order',
    title: 'Приказ об отзыве из отпуска',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Возвращение работника из отпуска с его согласия. Остаток переносится.',
    reviewed: false,
    layout: 'order',
    // Казахский и английский текст написан по образцу присланных приказов
    // теми же оборотами. Ссылки на статью закона здесь нет: для этого
    // документа она не прислана, а нормы права не выдумываются.
    langs: ['kk', 'ru', 'en'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      {
        id: 'recallDate',
        kind: 'date',
        label: 'Выйти на работу с',
        required: true,
        group: 'Отзыв',
        dateLimits: { notBefore: 'today' },
      },
      {
        id: 'remainingDays',
        kind: 'number',
        label: 'Неиспользованный остаток',
        required: true,
        unit: 'кал. дней',
        group: 'Отзыв',
      },
      {
        id: 'remainingDaysWords',
        kind: 'text',
        label: 'Остаток прописью',
        required: true,
        group: 'Отзыв',
        hint: 'Как в приказе: семь, четырнадцать',
        perLang: true,
      },
      {
        id: 'reason',
        kind: 'textarea',
        label: 'Причина отзыва',
        required: true,
        group: 'Отзыв',
        hint: 'Одной фразой: почему работник нужен на месте',
      },
      {
        // Отзыв без письменного согласия работника недействителен, поэтому
        // дата согласия обязательна и в будущем стоять не может.
        id: 'consentDate',
        kind: 'date',
        label: 'Дата согласия работника',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
    ],
    body: orderBody({
      subject: {
        kk: [[{ text: '«Еңбек демалысынан кері шақыру туралы»', bold: true }]],
        ru: [[{ text: '«Об отзыве из трудового отпуска»', bold: true }]],
        en: [[{ text: '“On recall from labour leave”', bold: true }]],
      },
      body: {
        kk: [
          [
            { text: '1. ' },
            { field: 'employee:nom', bold: true },
            { text: ' ' },
            { field: 'position' },
            { text: ' ' },
            { field: 'recallDate' },
            { text: ' бастап жыл сайынғы ақылы еңбек демалысынан кері шақырылсын. Себебі: ' },
            { field: 'reason' },
            { text: '.' },
          ],
          [
            { text: '2. Демалыстың пайдаланылмаған ' },
            { field: 'remainingDays' },
            { text: ' (' },
            { field: 'remainingDaysWords' },
            { text: ') күнтізбелік күні қызметкермен келісілген мерзімде берілсін.' },
          ],
          [{ text: '3. Бухгалтерия демалыс ақысын қайта есептесін.' }],
          [
            { text: 'Негіздеме: ', bold: true },
            { text: 'қызметкердің ' },
            { field: 'consentDate' },
            { text: ' жылғы жазбаша келісімі.' },
          ],
        ],
        ru: [
          [
            { text: '1. Отозвать ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', из ежегодного оплачиваемого трудового отпуска с ' },
            { field: 'recallDate' },
            { text: '. Причина: ' },
            { field: 'reason' },
            { text: '.' },
          ],
          [
            { text: '2. Неиспользованную часть отпуска продолжительностью ' },
            { field: 'remainingDays' },
            { text: ' (' },
            { field: 'remainingDaysWords' },
            { text: ') календарных дней предоставить в согласованный с работником срок.' },
          ],
          [{ text: '3. Бухгалтерии произвести перерасчёт отпускных выплат.' }],
          [
            { text: 'Основание: ', bold: true },
            { text: 'письменное согласие работника от ' },
            { field: 'consentDate' },
            { text: '.' },
          ],
        ],
        en: [
          [
            { text: '1. To recall ' },
            { field: 'employee', bold: true },
            { text: ', ' },
            { field: 'position' },
            { text: ', from the annual paid labour leave from ' },
            { field: 'recallDate' },
            { text: '. Reason: ' },
            { field: 'reason' },
            { text: '.' },
          ],
          [
            { text: '2. The unused part of the leave of ' },
            { field: 'remainingDays' },
            { text: ' (' },
            { field: 'remainingDaysWords' },
            { text: ') calendar days shall be granted at a time agreed with the employee.' },
          ],
          [{ text: '3. To Accountant Department – to recalculate the leave payments.' }],
          [
            { text: 'Basis: ', bold: true },
            { text: 'written consent of the employee dated ' },
            { field: 'consentDate' },
            { text: '.' },
          ],
        ],
      },
    }),
  },

  {
    id: 'hr-bonus-order',
    title: 'Приказ о поощрении (премировании)',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Премия, благодарность или иное поощрение работника за результат.',
    reviewed: false,
    // Бланк тот же, что у остальных документов, но тело выходит в одну
    // колонку: проверенного казахского и английского текста ещё нет.
    // Список фраз для переводчика – docs/translation-request.md.
    layout: 'order',
    langs: ['ru'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      {
        id: 'kind',
        kind: 'select',
        label: 'Вид поощрения',
        required: true,
        group: 'Поощрение',
        options: ['премия', 'благодарность', 'ценный подарок', 'почётная грамота'],
      },
      {
        id: 'amount',
        kind: 'money',
        label: 'Сумма премии',
        required: false,
        unit: '₸',
        group: 'Поощрение',
        hint: 'Только для денежного поощрения. Для благодарности оставьте пустым',
      },
      {
        id: 'reason',
        kind: 'textarea',
        label: 'За что',
        required: true,
        group: 'Поощрение',
        hint: 'Например: за досрочное завершение проекта подстанции',
      },
      {
        id: 'memoDate',
        kind: 'date',
        label: 'Дата представления руководителя',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
    ],
    body: orderBody({
      subject: { ru: [[{ text: 'О поощрении работника', bold: true }]] },
      body: {
        ru: [
          [
                      { text: 'Поощрить ' },
                      { field: 'employee' },
                      { text: ', ' },
                      { field: 'position' },
                      { text: '. Вид поощрения: ' },
                      { field: 'kind' },
                      { text: '. За ' },
                      { field: 'reason' },
                      { text: '.' },
                    ],
                    [
                      { text: 'Бухгалтерии выплатить премию в размере ' },
                      { field: 'amount' },
                      { text: ' тенге в ближайшую выплату заработной платы.' },
                    ],
                    [{ text: 'Отделу кадров внести сведения о поощрении в личную карточку работника.' }],
          [{ text: 'Основание: ', bold: true }, { text: 'представление руководителя подразделения от ' }, { field: 'memoDate' }]
        ],
      },
    }),
  },

  {
    id: 'hr-discipline-order',
    title: 'Приказ о применении дисциплинарного взыскания',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    // Взыскание – узкий круг (catalog/profiles.yaml, профиль sensitive).
    profile: 'sensitive',
    purpose: 'Замечание или выговор работнику. Объяснительная обязательна до приказа.',
    reviewed: false,
    // Бланк тот же, что у остальных документов, но тело выходит в одну
    // колонку: проверенного казахского и английского текста ещё нет.
    // Список фраз для переводчика – docs/translation-request.md.
    layout: 'order',
    langs: ['ru'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      {
        id: 'penalty',
        kind: 'select',
        label: 'Вид взыскания',
        required: true,
        group: 'Взыскание',
        options: ['замечание', 'выговор', 'строгий выговор'],
      },
      {
        id: 'violationDate',
        kind: 'date',
        label: 'Дата проступка',
        required: true,
        group: 'Взыскание',
        dateLimits: { notAfter: 'today' },
      },
      {
        id: 'violation',
        kind: 'textarea',
        label: 'В чём состоит проступок',
        required: true,
        group: 'Взыскание',
        hint: 'Что именно нарушено и чем это подтверждается',
      },
      {
        // Взыскание без затребованного объяснения оспаривается, поэтому
        // дата обязательна и в будущем стоять не может.
        id: 'explanationDate',
        kind: 'date',
        label: 'Дата объяснительной работника',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
      },
      {
        id: 'actNumber',
        kind: 'text',
        label: 'Номер акта или служебной записки',
        required: true,
        group: 'Основание',
      },
    ],
    body: orderBody({
      subject: { ru: [[{ text: 'О применении дисциплинарного взыскания', bold: true }]] },
      body: {
        ru: [
          [
                      { text: 'Применить к ' },
                      { field: 'employee' },
                      { text: ', ' },
                      { field: 'position' },
                      { text: ', дисциплинарное взыскание в виде «' },
                      { field: 'penalty' },
                      { text: '» за нарушение, допущенное ' },
                      { field: 'violationDate' },
                      { text: ': ' },
                      { field: 'violation' },
                      { text: '.' },
                    ],
                    [
                      {
                        text:
                          'Отделу кадров ознакомить работника с настоящим приказом под подпись ' +
                          'и приобщить приказ к материалам личного дела.',
                      },
                    ],
          [{ text: 'Основание: ', bold: true }, { text: 'объяснительная работника от ' },
                    { field: 'explanationDate' },
                    { text: ', акт № ' },
                    { field: 'actNumber' }]
        ],
      },
    }),
  },

  {
    id: 'hr-work-certificate',
    title: 'Справка с места работы',
    sectionId: 'hr',
    subsectionId: 'hr-documents',
    series: 'Исх',
    profile: 'standard',
    purpose: 'Подтверждает место работы и должность. Выдаётся по заявлению работника.',
    reviewed: false,
    // Бланк тот же, что у остальных документов, но тело выходит в одну
    // колонку: проверенного казахского и английского текста ещё нет.
    // Список фраз для переводчика – docs/translation-request.md.
    layout: 'order',
    langs: ['ru'],
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        perLang: true,
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      { id: 'unit', kind: 'text', label: 'Подразделение', required: true, group: 'Работник' },
      {
        id: 'startDate',
        kind: 'date',
        label: 'Работает с',
        required: true,
        group: 'Работник',
        dateLimits: { notAfter: 'today' },
      },
      {
        id: 'destination',
        kind: 'text',
        label: 'Куда предъявляется',
        required: true,
        group: 'Назначение',
        hint: 'Например: по месту требования, в банк, в посольство',
      },
    ],
    body: documentBody({
      words: DOCUMENT_WORDS.certificate,
      body: {
        ru: [
          [{ text: 'Выдана ' },
                    { field: 'employee' },
                    { text: ' в том, что он(а) работает в организации ' },
                    { field: '@company.legalName' },
                    { text: ' в должности «' },
                    { field: 'position' },
                    { text: '» в подразделении «' },
                    { field: 'unit' },
                    { text: '» с ' },
                    { field: 'startDate' },
                    { text: ' по настоящее время.' }],
          [{ text: 'Справка выдана для предъявления: ' }, { field: 'destination' }, { text: '.' }]
        ],
      },
    }),
  },
];

/**
 * Все шаблоны системы.
 *
 * Сначала те, что стоят на настоящем бланке группы: их человек открывает
 * чаще, и именно они показывают, как документ выглядит на бумаге.
 */
export const templates: DocumentTemplate[] = [...blankTemplates, ...simpleTemplates];

export function findTemplate(id: string): DocumentTemplate | undefined {
  return templates.find((tpl) => tpl.id === id);
}

/**
 * Документы, которые уже учтены в каталоге, но шаблон для них ещё не заполнен.
 *
 * Показываем их наравне с готовыми и честно помечаем: иначе человек будет
 * думать, что система документ не поддерживает, и уйдёт делать его в Word.
 * Список — выборка из catalog/source/documents-list.txt; полностью каталог
 * наполняется на этапе 8.
 */
const soon: Array<[string, string, string]> = [
  ['Об утверждении штатного расписания', 'hr', 'hr-activity-orders'],
  ['Об утверждении графика отпусков', 'hr', 'hr-activity-orders'],
  ['О проведении аттестации работников', 'hr', 'hr-activity-orders'],
  ['Трудовой договор', 'hr', 'hr-documents'],
  ['Дополнительное соглашение к трудовому договору', 'hr', 'hr-documents'],
  ['Должностная инструкция', 'hr', 'hr-documents'],
  ['Соглашение о неразглашении (NDA)', 'hr', 'hr-documents'],
  ['Правила трудового распорядка', 'hr', 'hr-policies'],
  ['Положение об оплате труда и премировании', 'hr', 'hr-policies'],

  ['Договор поставки', 'legal', 'legal-contracts'],
  ['Договор оказания услуг', 'legal', 'legal-contracts'],
  ['Договор аренды', 'legal', 'legal-contracts'],
  ['Дополнительное соглашение к договору', 'legal', 'legal-contracts'],
  ['Претензия', 'legal', 'legal-claims'],
  ['Ответ на претензию', 'legal', 'legal-claims'],
  ['Исковое заявление', 'legal', 'legal-claims'],
  ['Приказ об отзыве доверенности', 'legal', 'legal-powers'],
  ['Гарантийное письмо', 'legal', 'legal-other'],
  ['Официальное письмо контрагенту', 'legal', 'legal-other'],

  ['Решение единственного участника', 'corporate', 'corporate-decisions'],
  ['Протокол общего собрания участников', 'corporate', 'corporate-decisions'],
  ['О создании комиссии', 'corporate', 'corporate-orders'],
  ['О праве подписи документов', 'corporate', 'corporate-orders'],

  ['Об учётной политике', 'finance', 'finance-orders'],
  ['О проведении инвентаризации', 'finance', 'finance-orders'],
  ['Счёт на оплату', 'finance', 'finance-primary'],
  ['Акт выполненных работ', 'finance', 'finance-primary'],
  ['Авансовый отчёт', 'finance', 'finance-primary'],
  ['Акт сверки взаиморасчётов', 'finance', 'finance-primary'],
  ['Заявка на оплату', 'finance', 'finance-planning'],

  ['Заявка на закупку', 'procurement-sales', 'procurement'],
  ['Запрос коммерческих предложений', 'procurement-sales', 'procurement'],
  ['Протокол выбора поставщика', 'procurement-sales', 'procurement'],
  ['Коммерческое предложение', 'procurement-sales', 'sales'],
  ['Спецификация к договору', 'procurement-sales', 'sales'],

  ['Приходная накладная', 'warehouse', ''],
  ['Накладная на внутреннее перемещение', 'warehouse', ''],
  ['Путевой лист', 'warehouse', ''],
  ['Акт инвентаризации склада', 'warehouse', ''],
  ['Доверенность на получение товара', 'warehouse', ''],

  ['Протокол совещания', 'administration', 'administration-records'],
  ['Номенклатура дел', 'administration', 'administration-records'],
  ['Акт приёма-передачи дел', 'administration', 'administration-records'],
  ['Заявка на ремонт', 'administration', 'administration-facilities'],
  ['Заявка на хозяйственные нужды', 'administration', 'administration-facilities'],

  ['Устав проекта', 'projects', 'projects-initiation'],
  ['Приказ об открытии проекта', 'projects', 'projects-initiation'],
  ['Техническое задание', 'projects', 'projects-planning'],
  ['Статус-отчёт по проекту', 'projects', 'projects-execution'],
  ['Акт приёмки результатов проекта', 'projects', 'projects-closing'],

  ['Заявка на ИТ-обслуживание', 'it-security', 'it'],
  ['Акт приёма-передачи техники работнику', 'it-security', 'it'],
  ['Заявка на предоставление доступа', 'it-security', 'security'],
  ['Политика информационной безопасности', 'it-security', 'security'],

  ['Приказ о назначении ответственного за охрану труда', 'hse', 'hse-general'],
  ['Журнал вводного инструктажа', 'hse', 'hse-labour'],
  ['Наряд-допуск на работы повышенной опасности', 'hse', 'hse-labour'],
  ['Акт о несчастном случае', 'hse', 'hse-incidents'],
  ['Инструкция о мерах пожарной безопасности', 'hse', 'hse-fire'],

  ['Бриф на рекламу', 'marketing', ''],
  ['Договор с рекламным агентством', 'marketing', ''],
  ['Отчёт о рекламной кампании', 'marketing', ''],
];

export const catalogEntries: CatalogEntry[] = [
  ...templates.map<CatalogEntry>((tpl) => ({
    id: tpl.id,
    title: tpl.title,
    sectionId: tpl.sectionId,
    subsectionId: tpl.subsectionId,
    state: 'ready',
  })),
  ...soon.map<CatalogEntry>(([title, sectionId, subsectionId], index) => ({
    id: `soon-${index}`,
    title,
    sectionId,
    subsectionId,
    state: 'soon',
  })),
];
