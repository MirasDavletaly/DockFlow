import { describe, expect, it } from 'vitest';

import { englishName, kazakhDative, transliterate } from './names';

describe('имя латиницей', () => {
  it.each([
    ['Ахметов Асхат Каирович', 'Askhat Akhmetov'],
    ['Хамит Нурдаулет Алмазович', 'Nurdaulet Khamit'],
    ['Сулейменова Айгерим Бақытқызы', 'Aigerim Suleimenova'],
    ['Жақсылықова Динара Талғатқызы', 'Dinara Zhaksylykova'],
    ['Ким Ирина Сергеевна', 'Irina Kim'],
    // Два слова – порядок как записан: у группы так пишут и «Имя Фамилия».
    ['Самал Кабешова', 'Samal Kabeshova'],
    ['Султангалиева А.Т.', 'Sultangalieva A.T.'],
  ])('«%s» – «%s»', (ru, en) => {
    expect(englishName(ru)).toBe(en);
  });

  it('казахские буквы и мягкий знак', () => {
    expect(transliterate('Қабыл Нұрмахамбет')).toBe('Kabyl Nurmakhambet');
    expect(transliterate('Игорь Щукин')).toBe('Igor Shchukin');
    expect(transliterate('София')).toBe('Sofiya');
  });
});

describe('казахский дательный падеж', () => {
  it.each([
    ['Нуржанов Диас Жанболатович', 'Нуржанов Диас Жанболатовичке'],
    ['Ким Ирина Сергеевна', 'Ким Ирина Сергеевнаға'],
    ['Сулейменова Айгерим Бақытқызы', 'Сулейменова Айгерим Бақытқызына'],
    ['Серіков Ержан Болатұлы', 'Серіков Ержан Болатұлына'],
    ['Айгерим', 'Айгеримге'],
    ['Нұрлан', 'Нұрланға'],
    ['Асхат', 'Асхатқа'],
  ])('«%s» – «%s»', (name, dative) => {
    expect(kazakhDative(name)).toBe(dative);
  });
});
