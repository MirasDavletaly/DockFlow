/**
 * Компании группы.
 *
 * Первые три заведены по настоящим реквизитам (ответ на Q16,
 * `docs/questions.md`). У каждой БИН проверен по контрольной цифре, все
 * счета — по mod-97, БИК соответствует банку.
 *
 * Последняя остаётся вымышленной: её БИН контрольную цифру не проходит,
 * поэтому у неё стоит `placeholder: true` и интерфейс показывает это прямо.
 * Она заменится, когда придут настоящие реквизиты.
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
    id: 'c-algoritmi',
    name: 'ТОО «Algoritmi KZ»',
    legalName: 'Товарищество с ограниченной ответственностью «Algoritmi KZ (Алгоритми КЗ)»',
    legalNameEn: 'Limited Liability Partnership Algoritmi KZ',
    bin: '131040015313',
    postalCode: '060011',
    address:
      'Республика Казахстан, Атырауская область, город Атырау, улица Бактыгерей Кулманов, строение 113В',
    addressEn:
      'Republic of Kazakhstan, Atyrau region, Atyrau city, Baktigerei Kulmanov street, 113B',
    phone: '+7 705 735 40 79',
    directorName: 'Қабыл Нұрмахамбет Маханбетханұлы',
    directorNameEn: 'Kabyl Nurmakhambet',
    directorTitle: 'Генеральный директор',
    directorTitleGenitive: 'Генерального директора',
    // Падеж не прислан: вписан по общему правилу и ждёт подтверждения.
    // В делопроизводстве РК казахские имена склоняют не всегда — Q20.
    directorNameGenitive: 'Қабыла Нұрмахамбета Маханбетханұлы',
    // Основание полномочий не прислано; «Устава» — обычное для ТОО. Q20.
    directorBasis: 'Устава',
    city: 'Атырау',
    // Фирменный цвет и логотип не присланы.
    accent: '#8a4b1f',
    monogram: 'AK',
    bank: {
      name: 'АО «Банк ЦентрКредит»',
      bik: 'KCJBKZKX',
      accounts: [
        { iban: 'KZ708562203127904467', currency: 'KZT' },
        { iban: 'KZ588562203227904990', currency: 'USD' },
        { iban: 'KZ378562203227905077', currency: 'EUR' },
      ],
    },
    taxOffice: {
      name: 'РГУ «УГД по городу Атырау ДГД по Атырауской области КГД МФ РК»',
      bin: '090440011223',
    },
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
