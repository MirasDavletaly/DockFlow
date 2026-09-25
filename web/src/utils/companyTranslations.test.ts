/**
 * Новая компания: переводы реквизитов по правилам («Тест день 3»).
 */
import { describe, expect, it } from 'vitest';

import { cityEn, cityKk, legalNameEn, legalNameKk, shortNameEn, withCompanyTranslations } from './companyTranslations';

import type { Company } from '@/api/types';

const blank: Company = {
  id: 'c-new',
  name: 'Новая компания',
  legalName: 'Новая компания',
  bin: '',
  address: '',
  directorName: '',
  directorTitle: 'Директор',
  directorTitleGenitive: 'Директора',
  directorNameGenitive: '',
  directorBasis: 'Устава',
  city: '',
  accent: '#2f3b8f',
  monogram: 'НК',
};

describe('наименование', () => {
  it('ТОО – по образцу бланков группы', () => {
    const full = 'Товарищество с ограниченной ответственностью «Тұлпар Сервис»';
    expect(legalNameKk(full)).toBe('ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «Тұлпар Сервис»');
    expect(legalNameEn(full)).toBe('«Tulpar Servis» LLP');
    expect(shortNameEn('ТОО «EFFEGI EURASIA»')).toBe('EFFEGI EURASIA LLP');
  });

  it('незнакомая форма собственности не выдумывается', () => {
    expect(legalNameKk('Акционерное общество «Банк»')).toBe('');
    expect(legalNameEn('Акционерное общество «Банк»')).toBe('');
  });
});

describe('город', () => {
  it.each([
    ['Уральск', 'Орал', 'Uralsk'],
    ['Аксай', 'Ақсай', 'Aksai'],
    ['Усть-Каменогорск', 'Өскемен', 'Ust-Kamenogorsk'],
  ])('«%s» – «%s», «%s»', (ru, kk, en) => {
    expect(cityKk(ru)).toBe(kk);
    expect(cityEn(ru)).toBe(en);
  });

  it('нет в словаре – казахского нет, английский латиницей', () => {
    expect(cityKk('Бейнеу')).toBe('');
    expect(cityEn('Бейнеу')).toBe('Beineu');
  });
});

describe('правка карточки', () => {
  it('переводы заполняются сами', () => {
    let company = withCompanyTranslations(blank, {
      legalName: 'Товарищество с ограниченной ответственностью «Тест»',
    });
    company = withCompanyTranslations(company, { name: 'ТОО «Тест»' });
    company = withCompanyTranslations(company, { city: 'Атырау' });
    company = withCompanyTranslations(company, { directorName: 'Иванов Иван Иванович' });
    company = withCompanyTranslations(company, { directorTitle: 'Генеральный директор' });

    expect(company.legalNameKk).toBe('ЖАУАПКЕРШІЛІГІ ШЕКТЕУЛІ СЕРІКТЕСТІК «Тест»');
    expect(company.legalNameEn).toBe('«Test» LLP');
    expect(company.nameEn).toBe('Test LLP');
    expect(company.cityKk).toBe('Атырау');
    expect(company.cityEn).toBe('Atyrau');
    expect(company.directorNameEn).toBe('Ivan Ivanov');
    expect(company.directorTitleKk).toBe('Бас директор');
    expect(company.directorTitleEn).toBe('General Director');
  });

  it('поправленное руками не затирается', () => {
    const own = { ...blank, city: 'Атырау', cityEn: 'Atyrau city' };
    const next = withCompanyTranslations(own, { city: 'Аксай' });
    expect(next.cityEn).toBe('Atyrau city');
    expect(next.cityKk).toBe('Ақсай');
  });

  it('прежняя подстановка пересобирается', () => {
    const first = withCompanyTranslations(blank, { city: 'Атырау' });
    const second = withCompanyTranslations(first, { city: 'Уральск' });
    expect(second.cityEn).toBe('Uralsk');
    expect(second.cityKk).toBe('Орал');
  });

  it('родительный падеж не подставляется', () => {
    const next = withCompanyTranslations(blank, { directorName: 'Иванов Иван Иванович' });
    expect(next.directorNameGenitive).toBe('');
  });
});
