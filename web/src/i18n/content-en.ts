/**
 * Английский перевод содержимого каталога. Ключ – русская строка как она
 * записана в данных.
 *
 * Полноту проверяет тест `content.test.ts`: строка каталога без перевода
 * ловится там, а не на экране.
 */
export const contentEn: Record<string, string> = {
  // ── Разделы ─────────────────────────────────────────────────────────────
  'Отдел кадров': 'Human resources',
  'Кадры': 'HR',
  'Юридический отдел': 'Legal department',
  'Юристы': 'Legal',
  'Корпоративное управление': 'Corporate governance',
  'Корпоративное': 'Corporate',
  'Финансы и бухгалтерия': 'Finance and accounting',
  'Финансы': 'Finance',
  'Закупки и продажи': 'Procurement and sales',
  'Закупки': 'Procurement',
  'Склад и логистика': 'Warehouse and logistics',
  'Склад': 'Warehouse',
  'Административно-хозяйственный отдел': 'Administration and facilities',
  'АХО': 'Facilities',
  'Проекты': 'Projects',
  'ИТ и информационная безопасность': 'IT and information security',
  'ИТ и ИБ': 'IT and security',
  'Охрана труда и экология': 'Health, safety and environment',
  'HSE': 'HSE',
  'Маркетинг': 'Marketing',

  // ── Подразделы ──────────────────────────────────────────────────────────
  'Приказы по личному составу': 'Personnel orders',
  'Приказы по основной деятельности': 'Orders on core activity',
  'Кадровые документы': 'HR documents',
  'Локальные акты': 'Internal regulations',
  'Договоры': 'Contracts',
  'Претензионная и судебная работа': 'Claims and litigation',
  'Доверенности': 'Powers of attorney',
  'Прочее': 'Other',
  'Учредительные документы': 'Founding documents',
  'Решения органов управления': 'Decisions of governing bodies',
  'Внутренние положения': 'Internal policies',
  'Приказы руководителя': 'Orders of the head',
  'Приказы': 'Orders',
  'Первичные документы': 'Primary documents',
  'Планирование и казначейство': 'Planning and treasury',
  'Отчётность и регистры': 'Reporting and registers',
  'Положения': 'Policies',
  'Закупки и снабжение': 'Procurement and supply',
  'Продажи': 'Sales',
  'Хозяйственная часть': 'Facilities management',
  'Делопроизводство': 'Records management',
  'Общие документы': 'General documents',
  'Инициация': 'Initiation',
  'Планирование': 'Planning',
  'Исполнение и контроль': 'Execution and control',
  'Закрытие': 'Closure',
  'Строительные и инженерные проекты': 'Construction and engineering projects',
  'ИТ': 'IT',
  'Информационная безопасность': 'Information security',
  'Охрана труда': 'Occupational safety',
  'Пожарная и промышленная безопасность': 'Fire and industrial safety',
  'Экология': 'Environment',
  'Несчастные случаи и происшествия': 'Accidents and incidents',

  // ── Роли ────────────────────────────────────────────────────────────────
  'Администратор': 'Administrator',
  'Директор': 'Director',
  'Работник': 'Employee',
  'Заводит компании и людей, видит и правит документы всех компаний, ведёт журнал действий.':
    'Creates companies and people, sees and corrects documents of every company, keeps the activity log.',
  'Всё, что может работник, плюс управление своей компанией: сотрудники и их доступ, персонал, реквизиты и все её документы.':
    'Everything an employee can do, plus running their company: employees and their access, personnel, company details and all its documents.',
  'Создаёт документы в разрешённых ему разделах. Видит свои документы, а чужие – только в открытых ему разделах или по выданному доступу.':
    'Creates documents in the sections granted to them. Sees their own documents, and other people documents only in sections opened to them or by granted access.',
};
