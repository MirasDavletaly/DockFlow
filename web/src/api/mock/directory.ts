/**
 * Условный справочник: работники и контрагенты.
 *
 * Это краткие карточки — ФИО, должность, отдел. ИИН и оклада здесь нет
 * намеренно: их видит только кадровик с отдельным правом (CLAUDE.md, п. 3.10),
 * и на сайт они попадают отдельным запросом, а не вместе со списком выбора.
 */
import type { Counterparty, EmployeeBrief } from '@/api/types';

export const employees: EmployeeBrief[] = [
  {
    id: 'e-1',
    fullName: 'Ахметов Асхат Каирович',
    fullNameGenitive: 'Ахметова Асхата Каировича',
    position: 'Инженер-проектировщик',
    unit: 'Проектный отдел',
  },
  {
    id: 'e-2',
    fullName: 'Ким Ирина Сергеевна',
    fullNameGenitive: 'Ким Ирину Сергеевну',
    position: 'Бухгалтер',
    unit: 'Бухгалтерия',
  },
  {
    id: 'e-3',
    fullName: 'Сулейменова Айгерим Бақытқызы',
    fullNameGenitive: 'Сулейменову Айгерим Бақытқызы',
    position: 'Юрисконсульт',
    unit: 'Юридический отдел',
  },
  {
    id: 'e-4',
    fullName: 'Оспанов Нұрлан Ерболатович',
    fullNameGenitive: 'Оспанова Нұрлана Ерболатовича',
    position: 'Менеджер по закупкам',
    unit: 'Отдел снабжения',
  },
  {
    id: 'e-5',
    fullName: 'Ветров Павел Игоревич',
    fullNameGenitive: 'Ветрова Павла Игоревича',
    position: 'Системный администратор',
    unit: 'ИТ-служба',
  },
  {
    id: 'e-6',
    fullName: 'Жақсылықова Динара Талғатқызы',
    fullNameGenitive: 'Жақсылықову Динару Талғатқызы',
    position: 'Специалист по кадрам',
    unit: 'Отдел кадров',
  },
];

export const counterparties: Counterparty[] = [
  {
    id: 'k-1',
    name: 'ТОО «Тұлпар Сервис»',
    bin: '000000000011',
    address: 'г. Алматы, ул. Розыбакиева, 200',
  },
  {
    id: 'k-2',
    name: 'ТОО «Бәйтерек Строй»',
    bin: '000000000012',
    address: 'г. Астана, ул. Сыганак, 25',
  },
  {
    id: 'k-3',
    name: 'ИП Каримов Р. А.',
    bin: '000000000013',
    address: 'г. Шымкент, ул. Байтурсынова, 8',
  },
];

export function findEmployee(id: string): EmployeeBrief | undefined {
  return employees.find((e) => e.id === id);
}

export function findCounterparty(id: string): Counterparty | undefined {
  return counterparties.find((c) => c.id === id);
}
