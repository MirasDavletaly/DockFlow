/**
 * Компании группы.
 *
 * Первая — ТОО «ExLumen» — заведена по настоящим реквизитам (ответ на Q16,
 * `docs/questions.md`). БИН проверен по контрольной цифре, все три ИИК —
 * по mod-97, БИК соответствует банку.
 *
 * Остальные три остаются вымышленными: их БИН контрольную цифру не проходит,
 * поэтому у них стоит `placeholder: true` и интерфейс показывает это прямо.
 * Они заменяются по мере того, как приходят настоящие реквизиты.
 */
import type { Company } from '@/api/types';

export const companies: Company[] = [
  {
    id: 'c-exlumen',
    name: 'ТОО «ExLumen»',
    legalName: 'Товарищество с ограниченной ответственностью «ExLumen»',
    bin: '251040008414',
    kbe: '17',
    postalCode: '060011',
    address: 'Республика Казахстан, город Атырау, улица Бактыгерей Кулманов, строение 113В',
    directorName: 'Хамит Нурдаулет Алмазович',
    directorTitle: 'Генеральный директор',
    // Падежи заполнены по общему правилу и ждут подтверждения человека:
    // ошибка здесь попадает прямо в текст приказа (docs/questions.md, Q18).
    directorTitleGenitive: 'Генерального директора',
    directorNameGenitive: 'Хамита Нурдаулета Алмазовича',
    // Основание полномочий не прислано; «Устава» — обычное для директора ТОО,
    // но это предположение, а не реквизит. Тоже Q18.
    directorBasis: 'Устава',
    city: 'Атырау',
    // Фирменный цвет не прислан: пока стоит цвет самой системы.
    accent: '#2f3b8f',
    monogram: 'EL',
    bank: {
      name: 'АО «Банк ЦентрКредит»',
      bik: 'KCJBKZKX',
      accounts: [
        { iban: 'KZ848562203149704674', currency: 'KZT' },
        { iban: 'KZ688562203249707694', currency: 'USD' },
        { iban: 'KZ718562203249707737', currency: 'EUR' },
      ],
    },
  },
  {
    id: 'c-kurylys',
    name: 'ТОО «Құрылыс Групп»',
    legalName: 'Товарищество с ограниченной ответственностью «Құрылыс Групп»',
    bin: '000000000002',
    address: 'город Астана, улица Кунаева, 12',
    directorName: 'Досжанова Ұлжан Серікқызы',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Досжанову Ұлжан Серікқызы',
    directorBasis: 'Устава',
    city: 'Астана',
    accent: '#1f5c4a',
    monogram: 'ҚҒ',
    placeholder: true,
  },
  {
    id: 'c-logistic',
    name: 'ТОО «Сапар Логистик»',
    legalName: 'Товарищество с ограниченной ответственностью «Сапар Логистик»',
    bin: '000000000003',
    address: 'город Шымкент, улица Тауке хана, 40',
    directorName: 'Нұрғалиев Дәурен Маратович',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Нұрғалиева Дәурена Маратовича',
    directorBasis: 'Устава',
    city: 'Шымкент',
    accent: '#8a4b1f',
    monogram: 'СЛ',
    placeholder: true,
  },
  {
    id: 'c-trade',
    name: 'ТОО «Алтын Сауда»',
    legalName: 'Товарищество с ограниченной ответственностью «Алтын Сауда»',
    bin: '000000000004',
    address: 'город Караганда, проспект Бухар жырау, 55',
    directorName: 'Ким Виктор Анатольевич',
    directorTitle: 'Директор',
    directorTitleGenitive: 'Директора',
    directorNameGenitive: 'Кима Виктора Анатольевича',
    directorBasis: 'Устава',
    city: 'Караганда',
    accent: '#5b2f7a',
    monogram: 'АС',
    placeholder: true,
  },
];

export function findCompany(id: string): Company | undefined {
  return companies.find((c) => c.id === id);
}
