/**
 * Компании группы.
 *
 * Первые две — ТОО «ExLumen» и Kazakhstan New Technologies LLP — заведены по
 * настоящим реквизитам (ответ на Q16, `docs/questions.md`). У обеих БИН
 * проверен по контрольной цифре, все счета — по mod-97, БИК соответствует
 * банку.
 *
 * Остальные две остаются вымышленными: их БИН контрольную цифру не проходит,
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
    id: 'c-knt',
    name: 'Kazakhstan New Technologies LLP',
    // В присланных реквизитах первая буква «К» — кириллическая (U+041A)
    // внутри латинского слова, и в русском, и в английском написании.
    // Здесь записана латиница: иначе поиск по «Kazakhstan» компанию не
    // найдёт, а на бумаге разница неразличима. Ждёт сверки с уставом
    // (docs/questions.md, Q19).
    legalName: 'Партнерство с ограниченной ответственностью «Kazakhstan New Technologies LLP»',
    legalNameEn: '«Kazakhstan New Technologies» Limited Liability Partnership',
    bin: '200840900077',
    postalCode: 'Z05T3F2',
    address: 'город Астана, проспект Мәңгілік Ел, 55/16, офис 333-334',
    addressEn: 'Astana city, Mangilik El Ave., 55/16, office 333-334',
    directorName: 'Гезини Алессандро',
    directorNameEn: 'Ghesini Alessandro',
    directorTitle: 'Генеральный директор',
    directorTitleGenitive: 'Генерального директора',
    // Итальянские «Гезини» и «Алессандро» в русском не склоняются, поэтому
    // родительный падеж совпадает с именительным. Это тот случай, ради
    // которого падежи и хранятся данными, а не вычисляются.
    directorNameGenitive: 'Гезини Алессандро',
    // Основание полномочий не прислано. Для ПОО учредительный документ
    // может называться иначе, чем «Устав», поэтому здесь пусто: в тексте
    // доверенности останется видимый пропуск, а не выдуманное слово.
    directorBasis: '',
    city: 'Астана',
    // Фирменный цвет и логотип не присланы.
    accent: '#1f5c4a',
    monogram: 'KN',
    bank: {
      name: 'АО «Банк ЦентрКредит»',
      bik: 'KCJBKZKX',
      accounts: [
        { iban: 'KZ478562203110208007', currency: 'KZT' },
        { iban: 'KZ938562203210208068', currency: 'USD' },
        { iban: 'KZ258562203210208128', currency: 'EUR' },
      ],
    },
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
