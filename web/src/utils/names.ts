/**
 * Имена на других языках документа, когда их не вписали руками.
 *
 * В карточке работника казахское и латинское написание не обязательны, и
 * без них в английскую колонку шла кириллица, а в казахскую – имя без
 * дательного падежа («Тест день 2»: «пусть автоматически переводит на
 * английский и казахский»). Здесь – замена по правилам, а не перевод:
 * человек всегда может поправить написание в карточке или в форме.
 */

/**
 * Латиница по правилам, близким к паспортным (ICAO 9303) и к тому, как
 * написаны имена в документах группы: «Хамит» – «Khamit», «Қабыл» –
 * «Kabyl». Для «я» и «ю» – «ya», «yu», как в «Sofiya».
 */
const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
  ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

/** Кириллица латиницей; заглавная буква остаётся заглавной: «Жан» – «Zhan». */
export function transliterate(text: string): string {
  let out = '';
  for (const char of text) {
    const lower = char.toLocaleLowerCase('ru');
    const latin = LATIN[lower];
    if (latin === undefined) {
      out += char;
    } else if (char !== lower && latin !== '') {
      out += latin.charAt(0).toUpperCase() + latin.slice(1);
    } else {
      out += latin;
    }
  }
  return out;
}

/** Отчество по окончанию: «-ович», «-овна», «-ұлы», «-қызы». */
function isPatronymic(word: string): boolean {
  return /(вич|вна|ична|инична|ұлы|улы|қызы|кызы)$/iu.test(word);
}

/**
 * Имя для английской колонки: «Ахметов Асхат Каирович» – «Askhat Akhmetov».
 *
 * В английских документах группы имя идёт первым, отчества нет. Порядок
 * меняется, только если по отчеству видно, что запись русская: «Фамилия Имя
 * Отчество». Два слова и инициалы остаются в том порядке, как записаны.
 */
export function englishName(fullName: string): string {
  const words = fullName.trim().split(/\s+/u).filter(Boolean);
  const [surname, given, patronymic] = words;
  if (words.length === 3 && surname !== undefined && given !== undefined && patronymic !== undefined && isPatronymic(patronymic)) {
    return transliterate(`${given} ${surname}`);
  }
  return transliterate(words.join(' '));
}

const BACK_VOWELS = 'аоұыуяёю';
const FRONT_VOWELS = 'әеөүіиэ';
const VOICELESS = 'кқпстфхцчшщ';

/**
 * Казахский дательный падеж имени: «Нуржанов Диас Жанболатович» –
 * «…Жанболатовичке», «Ким Ирина Сергеевна» – «…Сергеевнаға».
 *
 * Окончание ставится на последнее слово. Твёрдое или мягкое – по последней
 * гласной слова, «қ/к» или «ғ/г» – по последнему звуку: после глухих
 * согласных «-қа/-ке», иначе «-ға/-ге». У «-ұлы», «-қызы» – «-на»:
 * «Бақытқызына».
 */
export function kazakhDative(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return trimmed;
  if (/(ұлы|улы|қызы|кызы)$/iu.test(trimmed)) return `${trimmed}на`;

  const lower = trimmed.toLocaleLowerCase('ru');
  const last = lower.at(-1) ?? '';

  let back = true;
  for (let i = lower.length - 1; i >= 0; i -= 1) {
    const char = lower[i] ?? '';
    if (BACK_VOWELS.includes(char)) break;
    if (FRONT_VOWELS.includes(char)) {
      back = false;
      break;
    }
  }

  const voiceless = VOICELESS.includes(last);
  const suffix = voiceless ? (back ? 'қа' : 'ке') : back ? 'ға' : 'ге';
  return `${trimmed}${suffix}`;
}
