/**
 * Типы, которыми обменивается сайт и сервер.
 *
 * Пока сервер отдаёт только /healthz, эти типы описывают то, что он будет
 * отдавать: они повторяют структуру каталога (catalog/*.yaml). Когда появится
 * api/openapi.yaml, файл заменится сгенерированным — руками его править
 * не придётся.
 */

/** Компания группы: реквизиты и брендинг. */
export interface Company {
  id: string;
  /** Краткое наименование для интерфейса: «ТОО «Астра»». */
  name: string;
  /** Полное наименование для документов. */
  legalName: string;
  bin: string;
  address: string;
  /** Руководитель: он подписывает документы. */
  directorName: string;
  directorTitle: string;
  /**
   * Должность и ФИО руководителя в родительном падеже: «в лице Директора
   * Сагинова Ерлана Жанатовича». Хранятся отдельно, потому что склонять
   * фамилии программно нельзя — на казахских и составных фамилиях это
   * даёт ошибки прямо в тексте документа.
   */
  directorTitleGenitive: string;
  directorNameGenitive: string;
  /** Основание полномочий: «на основании Устава». */
  directorBasis: string;
  city: string;
  /** Цвет компании: подменяет --accent после входа. */
  accent: string;
  /** Буквы для знака компании, пока не загружен логотип. */
  monogram: string;
}

/** Раздел каталога (catalog/sections.yaml). */
export interface Section {
  id: string;
  title: string;
  short: string;
  subsections: Subsection[];
}

export interface Subsection {
  id: string;
  title: string;
}

/** Работник для выбора в формах: краткая карточка, без ИИН и оклада. */
export interface EmployeeBrief {
  id: string;
  fullName: string;
  /** ФИО в родительном падеже: «принять Ахметова Асхата Каировича». */
  fullNameGenitive: string;
  position: string;
  unit: string;
}

export interface Counterparty {
  id: string;
  name: string;
  bin: string;
  address: string;
}

/** Тип поля формы. Определяет и орган ввода, и вид значения в документе. */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'money'
  | 'number'
  | 'employee'
  | 'counterparty'
  | 'select';

/** Описание одного поля (аналог записи в fields.yaml). */
export interface FieldDef {
  id: string;
  kind: FieldKind;
  label: string;
  /** Пояснение под полем: что именно сюда вписывают. */
  hint?: string;
  required: boolean;
  /** Варианты для kind: 'select'. */
  options?: string[];
  /** Единица измерения справа в поле: «₸», «дней». */
  unit?: string;
  /** Группа полей на форме: поля одной группы стоят рядом под общим заголовком. */
  group: string;
}

/** Кусок текста документа: либо постоянный текст, либо подстановка поля. */
export type Run = { text: string } | { field: string };

/** Блок документа. Из блоков собирается лист. */
export type DocBlock =
  | { kind: 'company-header' }
  | { kind: 'doc-number' }
  | { kind: 'title'; text: string }
  | { kind: 'subtitle'; runs: Run[] }
  | { kind: 'paragraph'; runs: Run[] }
  | { kind: 'preamble'; runs: Run[] }
  | { kind: 'order-word'; text: string }
  | { kind: 'numbered'; items: Run[][] }
  | { kind: 'basis'; runs: Run[] }
  | { kind: 'signature' }
  | { kind: 'acquaint' };

/** Шаблон документа: описание формы и самого листа. */
export interface DocumentTemplate {
  id: string;
  title: string;
  /** Раздел, которому документ принадлежит: по нему проверяется право. */
  sectionId: string;
  subsectionId: string;
  /** Серия номера (catalog/series.yaml). */
  series: string;
  profile: 'standard' | 'sensitive' | 'policy' | 'register' | 'self-service' | 'external';
  /** Краткое объяснение, когда этот документ нужен. */
  purpose: string;
  /**
   * Проверен ли текст юристом. Пока false — интерфейс показывает пометку,
   * чтобы черновик текста не ушёл в дело как готовый (CLAUDE.md, п. 4.9).
   */
  reviewed: boolean;
  fields: FieldDef[];
  body: DocBlock[];
}

/**
 * Строка каталога «Создать документ».
 *
 * Документ из списка заказчика может ещё не иметь шаблона. Показываем его
 * всё равно: человек должен видеть, что документ в системе учтён, а не
 * гадать, почему его нет.
 */
export interface CatalogEntry {
  id: string;
  title: string;
  sectionId: string;
  subsectionId: string;
  /** ready — шаблон заполнен и документ можно создать; soon — шаблон готовится. */
  state: 'ready' | 'soon';
}

/** Состояние документа. Повторяет жизненный цикл из архитектуры, п. 7. */
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'archived';

/** Созданный документ. */
export interface DocumentRecord {
  id: string;
  templateId: string;
  companyId: string;
  title: string;
  status: DocumentStatus;
  /** Номер появляется только при утверждении, до этого его нет. */
  number: string | null;
  createdAt: string;
  /** Снимок значений полей: изменение справочника его не меняет. */
  values: Record<string, string>;
  authorName: string;
}
