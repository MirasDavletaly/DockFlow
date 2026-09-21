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
import type { CatalogEntry, DocumentTemplate } from '@/api/types';

export const templates: DocumentTemplate[] = [
  {
    id: 'hr-hire-order',
    title: 'Приказ о приёме на работу',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Оформляет выход нового работника. Основание — подписанный трудовой договор.',
    reviewed: false,
    fields: [
      {
        id: 'employee',
        kind: 'employee',
        label: 'Работник',
        required: true,
        group: 'Работник',
        hint: 'Должность и подразделение подставятся из справочника',
      },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      { id: 'unit', kind: 'text', label: 'Подразделение', required: true, group: 'Работник' },
      { id: 'startDate', kind: 'date', label: 'Дата приёма', required: true, group: 'Условия труда' },
      {
        id: 'salary',
        kind: 'money',
        label: 'Должностной оклад',
        required: true,
        unit: '₸',
        group: 'Условия труда',
        hint: 'В месяц, до удержаний',
      },
      {
        id: 'probation',
        kind: 'select',
        label: 'Испытательный срок',
        required: true,
        group: 'Условия труда',
        options: ['без испытательного срока', 'один месяц', 'два месяца', 'три месяца'],
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
      },
    ],
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О приёме на работу' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Принять ' },
            { field: 'employee' },
            { text: ' на должность «' },
            { field: 'position' },
            { text: '» в подразделение «' },
            { field: 'unit' },
            { text: '» с ' },
            { field: 'startDate' },
            { text: '.' },
          ],
          [
            { text: 'Установить должностной оклад в размере ' },
            { field: 'salary' },
            { text: ' тенге в месяц.' },
          ],
          [{ text: 'Установить испытательный срок: ' }, { field: 'probation' }, { text: '.' }],
          [
            {
              text:
                'Отделу кадров ознакомить работника с настоящим приказом под подпись, ' +
                'бухгалтерии — произвести начисление заработной платы с даты приёма.',
            },
          ],
        ],
      },
      {
        kind: 'basis',
        runs: [
          { text: 'трудовой договор от ' },
          { field: 'contractDate' },
          { text: ' № ' },
          { field: 'contractNumber' },
        ],
      },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
  },

  {
    id: 'hr-vacation-order',
    title: 'Приказ о предоставлении отпуска',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Ежегодный оплачиваемый трудовой отпуск по заявлению работника.',
    reviewed: false,
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      {
        id: 'days',
        kind: 'number',
        label: 'Продолжительность',
        required: true,
        unit: 'кал. дней',
        group: 'Период отпуска',
      },
      { id: 'from', kind: 'date', label: 'Первый день отпуска', required: true, group: 'Период отпуска' },
      { id: 'to', kind: 'date', label: 'Последний день отпуска', required: true, group: 'Период отпуска' },
      {
        id: 'applicationDate',
        kind: 'date',
        label: 'Дата заявления работника',
        required: true,
        group: 'Основание',
      },
    ],
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О предоставлении ежегодного оплачиваемого трудового отпуска' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Предоставить ' },
            { field: 'employee' },
            { text: ', ' },
            { field: 'position' },
            { text: ', ежегодный оплачиваемый трудовой отпуск продолжительностью ' },
            { field: 'days' },
            { text: ' календарных дней с ' },
            { field: 'from' },
            { text: ' по ' },
            { field: 'to' },
            { text: '.' },
          ],
          [{ text: 'Бухгалтерии произвести расчёт отпускных выплат в установленный срок.' }],
        ],
      },
      { kind: 'basis', runs: [{ text: 'заявление работника от ' }, { field: 'applicationDate' }] },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
  },

  {
    id: 'hr-trip-order',
    title: 'Приказ о направлении в командировку',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Служебная поездка работника с выдачей аванса на расходы.',
    reviewed: false,
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
      { id: 'from', kind: 'date', label: 'Дата выезда', required: true, group: 'Сроки' },
      { id: 'to', kind: 'date', label: 'Дата возвращения', required: true, group: 'Сроки' },
    ],
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О направлении в командировку' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Направить ' },
            { field: 'employee' },
            { text: ', ' },
            { field: 'position' },
            { text: ', в командировку в г. ' },
            { field: 'city' },
            { text: ', ' },
            { field: 'organization' },
            { text: ', сроком на ' },
            { field: 'days' },
            { text: ' календарных дней с ' },
            { field: 'from' },
            { text: ' по ' },
            { field: 'to' },
            { text: '.' },
          ],
          [{ text: 'Цель командировки: ' }, { field: 'purpose' }, { text: '.' }],
          [{ text: 'Бухгалтерии выдать аванс на командировочные расходы до даты выезда.' }],
          [{ text: 'Работнику представить авансовый отчёт в установленный срок после возвращения.' }],
        ],
      },
      { kind: 'basis', runs: [{ text: 'служебная записка руководителя подразделения' }] },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
  },

  {
    id: 'legal-power-single',
    title: 'Доверенность разовая',
    sectionId: 'legal',
    subsectionId: 'legal-powers',
    series: 'Дов',
    profile: 'standard',
    purpose: 'Разовое полномочие работнику: получить товар, подписать акт, представить документы.',
    reviewed: false,
    fields: [
      { id: 'employee', kind: 'employee', label: 'Доверенное лицо', required: true, group: 'Кому' },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Кому' },
      {
        id: 'counterparty',
        kind: 'counterparty',
        label: 'Организация',
        required: true,
        group: 'Полномочия',
        hint: 'У кого получить или с кем подписать',
      },
      {
        id: 'subject',
        kind: 'textarea',
        label: 'Что поручается',
        required: true,
        group: 'Полномочия',
        hint: 'Например: получить товарно-материальные ценности по накладной',
      },
      { id: 'until', kind: 'date', label: 'Действительна до', required: true, group: 'Срок' },
    ],
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ДОВЕРЕННОСТЬ' },
      {
        kind: 'preamble',
        runs: [
          { field: '@company.legalName' },
          { text: ', в лице ' },
          { field: '@company.directorTitleGenitive' },
          { text: ' ' },
          { field: '@company.directorNameGenitive' },
          { text: ', действующего на основании ' },
          { field: '@company.directorBasis' },
          { text: ', настоящей доверенностью уполномочивает' },
        ],
      },
      {
        kind: 'paragraph',
        runs: [
          // Должность оставлена в кавычках и в именительном падеже: склонять
          // её вместе с фамилией пришлось бы программно, а это даёт ошибки
          // прямо в тексте документа.
          { field: 'employee' },
          { text: ', занимающего должность «' },
          { field: 'position' },
          { text: '», совершить следующие действия: ' },
          { field: 'subject' },
          { text: ' в отношениях с организацией ' },
          { field: 'counterparty' },
          { text: '.' },
        ],
      },
      {
        kind: 'paragraph',
        runs: [
          { text: 'Доверенность выдана без права передоверия и действительна до ' },
          { field: 'until' },
          { text: ' включительно.' },
        ],
      },
      { kind: 'signature' },
    ],
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
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
      { id: 'position', kind: 'text', label: 'Должность', required: true, group: 'Работник' },
      { id: 'unit', kind: 'text', label: 'Подразделение', required: true, group: 'Работник' },
      { id: 'startDate', kind: 'date', label: 'Работает с', required: true, group: 'Работник' },
      {
        id: 'destination',
        kind: 'text',
        label: 'Куда предъявляется',
        required: true,
        group: 'Назначение',
        hint: 'Например: по месту требования, в банк, в посольство',
      },
    ],
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'СПРАВКА' },
      {
        kind: 'paragraph',
        runs: [
          { text: 'Выдана ' },
          { field: 'employee' },
          { text: ' в том, что он(а) работает в организации ' },
          { field: '@company.legalName' },
          { text: ' в должности «' },
          { field: 'position' },
          { text: '» в подразделении «' },
          { field: 'unit' },
          { text: '» с ' },
          { field: 'startDate' },
          { text: ' по настоящее время.' },
        ],
      },
      {
        kind: 'paragraph',
        runs: [{ text: 'Справка выдана для предъявления: ' }, { field: 'destination' }, { text: '.' }],
      },
      { kind: 'signature' },
    ],
  },
];

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
  ['О переводе на другую должность', 'hr', 'hr-personnel-orders'],
  ['Об изменении оклада', 'hr', 'hr-personnel-orders'],
  ['О расторжении трудового договора', 'hr', 'hr-personnel-orders'],
  ['Об отзыве из отпуска', 'hr', 'hr-personnel-orders'],
  ['О поощрении (премировании)', 'hr', 'hr-personnel-orders'],
  ['О применении дисциплинарного взыскания', 'hr', 'hr-personnel-orders'],
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
  ['Генеральная доверенность', 'legal', 'legal-powers'],
  ['Приказ об отзыве доверенности', 'legal', 'legal-powers'],
  ['Гарантийное письмо', 'legal', 'legal-other'],
  ['Официальное письмо контрагенту', 'legal', 'legal-other'],

  ['Решение единственного участника', 'corporate', 'corporate-decisions'],
  ['Протокол общего собрания участников', 'corporate', 'corporate-decisions'],
  ['О вступлении в должность директора', 'corporate', 'corporate-orders'],
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
