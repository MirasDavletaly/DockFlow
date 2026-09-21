/**
 * Условные данные четырёх компаний группы.
 *
 * Реквизиты вымышленные: настоящие ждут ответа на Q16 в docs/questions.md.
 * БИН здесь не проходит проверку контрольной цифры и в документы попадать
 * не должен — на экранах он показан только как пример брендинга.
 */
import type { Company } from '@/api/types';

export const companies: Company[] = [
  {
    id: 'c-astra',
    name: 'ТОО «Астра»',
    legalName: 'Товарищество с ограниченной ответственностью «Астра»',
    bin: '000000000001',
    address: 'г. Алматы, пр. Абая, 150',
    directorName: 'Сагинов Ерлан Жанатович',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Сагинова Ерлана Жанатовича',
    directorBasis: 'Устава',
    city: 'Алматы',
    accent: '#2f3b8f',
    monogram: 'АС',
  },
  {
    id: 'c-kurylys',
    name: 'ТОО «Құрылыс Групп»',
    legalName: 'Товарищество с ограниченной ответственностью «Құрылыс Групп»',
    bin: '000000000002',
    address: 'г. Астана, ул. Кунаева, 12',
    directorName: 'Досжанова Ұлжан Серікқызы',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Досжанову Ұлжан Серікқызы',
    directorBasis: 'Устава',
    city: 'Астана',
    accent: '#1f5c4a',
    monogram: 'ҚҒ',
  },
  {
    id: 'c-logistic',
    name: 'ТОО «Сапар Логистик»',
    legalName: 'Товарищество с ограниченной ответственностью «Сапар Логистик»',
    bin: '000000000003',
    address: 'г. Шымкент, ул. Тауке хана, 40',
    directorName: 'Нұрғалиев Дәурен Маратович',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Нұрғалиева Дәурена Маратовича',
    directorBasis: 'Устава',
    city: 'Шымкент',
    accent: '#8a4b1f',
    monogram: 'СЛ',
  },
  {
    id: 'c-trade',
    name: 'ТОО «Алтын Сауда»',
    legalName: 'Товарищество с ограниченной ответственностью «Алтын Сауда»',
    bin: '000000000004',
    address: 'г. Караганда, пр. Бухар жырау, 55',
    directorName: 'Ким Виктор Анатольевич',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Кима Виктора Анатольевича',
    directorBasis: 'Устава',
    city: 'Караганда',
    accent: '#5b2f7a',
    monogram: 'АС',
  },
];

export function findCompany(id: string): Company | undefined {
  return companies.find((c) => c.id === id);
}
