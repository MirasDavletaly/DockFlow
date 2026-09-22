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
    purpose: 'Оформляет выход нового работника. Основание – подписанный трудовой договор.',
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
      {
        id: 'startDate',
        kind: 'date',
        label: 'Дата приёма',
        required: true,
        group: 'Условия труда',
        // Приказ о приёме задним числом недействителен: работник вышел на
        // работу без оформления, и это нарушение, а не опечатка.
        dateLimits: { notBefore: 'today' },
      },
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
        // Договор уже подписан: он основание приказа, а не следствие.
        dateLimits: { notAfter: 'today' },
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
                'бухгалтерии – произвести начисление заработной платы с даты приёма.',
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
      {
        id: 'from',
        kind: 'date',
        label: 'Первый день отпуска',
        required: true,
        group: 'Период отпуска',
        dateLimits: { notBefore: 'today' },
      },
      {
        id: 'to',
        kind: 'date',
        label: 'Последний день отпуска',
        required: true,
        group: 'Период отпуска',
        dateLimits: { afterField: 'from' },
      },
      {
        id: 'applicationDate',
        kind: 'date',
        label: 'Дата заявления работника',
        required: true,
        group: 'Основание',
        dateLimits: { notAfter: 'today' },
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
    id: 'hr-transfer-order',
    title: 'Приказ о переводе на другую должность',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Перевод работника на другую должность или в другое подразделение.',
    reviewed: false,
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О переводе на другую должность' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Перевести ' },
            { field: 'employee' },
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
            { text: 'Установить должностной оклад в размере ' },
            { field: 'salary' },
            { text: ' тенге в месяц с даты перевода.' },
          ],
          [
            {
              text:
                'Отделу кадров внести запись о переводе в трудовую книжку и личную карточку ' +
                'работника, бухгалтерии – производить начисление по новому окладу.',
            },
          ],
        ],
      },
      {
        kind: 'basis',
        runs: [
          { text: 'дополнительное соглашение к трудовому договору от ' },
          { field: 'agreementDate' },
          { text: ' № ' },
          { field: 'agreementNumber' },
        ],
      },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
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
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'Об изменении должностного оклада' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Установить ' },
            { field: 'employee' },
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
                'Бухгалтерии производить начисление заработной платы с учётом настоящего приказа.',
            },
          ],
          [
            {
              text:
                'Отделу кадров внести изменение в штатное расписание и личную карточку работника.',
            },
          ],
        ],
      },
      {
        kind: 'basis',
        runs: [
          { text: 'дополнительное соглашение к трудовому договору от ' },
          { field: 'agreementDate' },
          { text: ' № ' },
          { field: 'agreementNumber' },
        ],
      },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
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
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О расторжении трудового договора' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
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
    id: 'hr-vacation-recall-order',
    title: 'Приказ об отзыве из отпуска',
    sectionId: 'hr',
    subsectionId: 'hr-personnel-orders',
    series: 'К',
    profile: 'standard',
    purpose: 'Возвращение работника из отпуска с его согласия. Остаток переносится.',
    reviewed: false,
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'Об отзыве из трудового отпуска' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
          [
            { text: 'Отозвать ' },
            { field: 'employee' },
            { text: ', ' },
            { field: 'position' },
            { text: ', из ежегодного оплачиваемого трудового отпуска с ' },
            { field: 'recallDate' },
            { text: '. Причина: ' },
            { field: 'reason' },
            { text: '.' },
          ],
          [
            { text: 'Неиспользованную часть отпуска продолжительностью ' },
            { field: 'remainingDays' },
            { text: ' календарных дней предоставить в согласованный с работником срок.' },
          ],
          [{ text: 'Бухгалтерии произвести перерасчёт отпускных выплат.' }],
        ],
      },
      {
        kind: 'basis',
        runs: [{ text: 'письменное согласие работника от ' }, { field: 'consentDate' }],
      },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
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
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О поощрении работника' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
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
        ],
      },
      {
        kind: 'basis',
        runs: [{ text: 'представление руководителя подразделения от ' }, { field: 'memoDate' }],
      },
      { kind: 'signature' },
      { kind: 'acquaint' },
    ],
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
    fields: [
      { id: 'employee', kind: 'employee', label: 'Работник', required: true, group: 'Работник' },
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
    body: [
      { kind: 'company-header' },
      { kind: 'doc-number' },
      { kind: 'title', text: 'ПРИКАЗ' },
      { kind: 'subtitle', runs: [{ text: 'О применении дисциплинарного взыскания' }] },
      { kind: 'order-word', text: 'ПРИКАЗЫВАЮ:' },
      {
        kind: 'numbered',
        items: [
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
        ],
      },
      {
        kind: 'basis',
        runs: [
          { text: 'объяснительная работника от ' },
          { field: 'explanationDate' },
          { text: ', акт № ' },
          { field: 'actNumber' },
        ],
      },
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
      {
        id: 'basis',
        kind: 'text',
        label: 'Действует на основании',
        required: true,
        group: 'Кто выдаёт',
        hint: 'Учредительный документ или доверенность, по которой действует руководитель',
        // Подставляется из реквизитов компании. У компаний, чей учредительный
        // документ ещё не прислан, реквизит пуст – тогда человек вписывает
        // его сам, а в доверенности не остаётся пропуска.
        defaultFrom: '@company.directorBasis',
      },
      {
        id: 'until',
        kind: 'date',
        label: 'Действительна до',
        required: true,
        group: 'Срок',
        dateLimits: { notBefore: 'today' },
      },
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
          { field: 'basis' },
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
