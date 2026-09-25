/**
 * Вкладка «Персонал»: справочник людей компании для документов.
 *
 * Часть админ-панели (`AdminPage.tsx`): что в ней видно, решает политика по
 * правам, а не проверка роли на экране.
 */
import { useState } from 'react';

import { managedCompanyIds } from '@/access/policy';
import { lang, t } from '@/i18n';
import { companyName } from '@/i18n/company';
import { newId } from '@/store/db';
import { useSession } from '@/store/session';
import { translateJobTitle } from '@/utils/jobTitles';
import { englishName, kazakhDative, withRussianSpelling } from '@/utils/names';
import { matchesQuery } from '@/utils/search';

import styles from './AdminPage.module.css';
import { employeeSearchFields } from './searchFields';
import { NothingFound } from './shared';

import type { EmployeeBrief } from '@/api/types';
import type { TabProps } from './shared';

export function PeopleTab({ subject, query }: TabProps) {
  const { companies, allEmployees, company, saveEmployee, removeEmployee } = useSession();

  // Директору – только его компании, администратору – все.
  const scope = managedCompanyIds(subject);
  const ownCompanies = companies.filter((c) => scope === null || scope.includes(c.id));

  const [companyId, setCompanyId] = useState(
    ownCompanies.some((c) => c.id === company?.id) ? (company?.id ?? '') : (ownCompanies[0]?.id ?? ''),
  );
  const [draft, setDraft] = useState<EmployeeBrief | null>(null);

  // Персонал выбранной компании. Записи другой компании сюда не попадают
  // даже у администратора: смешать их значит подставить чужого человека
  // в приказ.
  const visible = allEmployees.filter(
    (e) => e.companyId === companyId && matchesQuery(query, employeeSearchFields(e)),
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionBody}>{t.admin.peopleBody}</p>
        <button
          type="button"
          className={styles.primary}
          disabled={companyId === ''}
          onClick={() =>
            setDraft({
              id: newId('e'),
              companyId,
              fullName: '',
              fullNameGenitive: '',
              position: '',
              unit: '',
            })
          }
        >
          {t.admin.personAdd}
        </button>
      </div>

      {ownCompanies.length < 2 ? null : (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.nav.company}</span>
          <select
            className={styles.input}
            value={companyId}
            onChange={(e) => {
              setDraft(null);
              setCompanyId(e.target.value);
            }}
          >
            {ownCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {companyName(c)}
              </option>
            ))}
          </select>
        </label>
      )}

      {draft === null ? null : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            saveEmployee({ ...draft, companyId });
            setDraft(null);
          }}
        >
          <p className={styles.fieldHint}>{t.admin.personAutoHint}</p>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personFullName}</span>
              <input
                className={styles.input}
                value={draft.fullName}
                onChange={(e) => setDraft(withTranslations(draft, { fullName: e.target.value }))}
                onBlur={() => setDraft(withRussianSpelling(draft))}
              />
              <span className={styles.fieldHint}>{t.admin.personRussianHint}</span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personGenitive}</span>
              <input
                className={styles.input}
                value={draft.fullNameGenitive}
                onChange={(e) => setDraft({ ...draft, fullNameGenitive: e.target.value })}
                onBlur={() => setDraft(withRussianSpelling(draft))}
              />
              <span className={styles.fieldHint}>{t.admin.personGenitiveHint}</span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personNameKk}</span>
              <input
                className={styles.input}
                value={draft.fullNameKk ?? ''}
                onChange={(e) => setDraft(withTranslations(draft, { fullNameKk: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personNameKkDative}</span>
              <input
                className={styles.input}
                value={draft.fullNameKkDative ?? ''}
                onChange={(e) => setDraft({ ...draft, fullNameKkDative: e.target.value })}
              />
              <span className={styles.fieldHint}>{t.admin.personNameKkDativeHint}</span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personNameEn}</span>
              <input
                className={styles.input}
                value={draft.fullNameEn ?? ''}
                onChange={(e) => setDraft({ ...draft, fullNameEn: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personPosition}</span>
              <input
                className={styles.input}
                value={draft.position}
                onChange={(e) => setDraft(withTranslations(draft, { position: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personPositionKk}</span>
              <input
                className={styles.input}
                value={draft.positionKk ?? ''}
                onChange={(e) => setDraft({ ...draft, positionKk: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personPositionEn}</span>
              <input
                className={styles.input}
                value={draft.positionEn ?? ''}
                onChange={(e) => setDraft({ ...draft, positionEn: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personUnit}</span>
              <input
                className={styles.input}
                value={draft.unit}
                onChange={(e) => setDraft(withTranslations(draft, { unit: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personUnitKk}</span>
              <input
                className={styles.input}
                value={draft.unitKk ?? ''}
                onChange={(e) => setDraft({ ...draft, unitKk: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personUnitEn}</span>
              <input
                className={styles.input}
                value={draft.unitEn ?? ''}
                onChange={(e) => setDraft({ ...draft, unitEn: e.target.value })}
              />
            </label>
          </div>

          <div className={styles.rowActions}>
            <button type="button" className={styles.secondary} onClick={() => setDraft(null)}>
              {t.common.cancel}
            </button>
            <button type="submit" className={styles.primary}>
              {t.common.save}
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <NothingFound />
      ) : (
        <table className={styles.table}>
          <thead>
            {/* На английском экране главное – английские значения: имя
                латиницей, должность и подразделение по-английски. Русская
                форма остаётся рядом – по ней человека находят в приказах. */}
            {lang === 'en' ? (
              <tr>
                <th>{t.admin.personFullName}</th>
                <th>{t.admin.personNameRu}</th>
                <th>{t.admin.personNameKk}</th>
                <th>{t.admin.personPosition}</th>
                <th>{t.admin.personUnit}</th>
                <th aria-label={t.common.remove} />
              </tr>
            ) : (
              <tr>
                <th>{t.admin.personFullName}</th>
                <th>{t.admin.personGenitive}</th>
                <th>{t.admin.personNameKk}</th>
                <th>{t.admin.personNameEn}</th>
                <th>{t.admin.personPosition}</th>
                <th>{t.admin.personUnit}</th>
                <th aria-label={t.common.remove} />
              </tr>
            )}
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr key={person.id}>
                {/* Чего нет в карточке, показано так, как это соберёт документ:
                    казахское имя – как русское, латиница – транслитерацией,
                    должность и подразделение – из словаря. */}
                {lang === 'en' ? (
                  <>
                    <td>{person.fullNameEn ?? englishName(person.fullName)}</td>
                    <td className={styles.muted}>{person.fullName}</td>
                    <td className={styles.muted}>{person.fullNameKk ?? person.fullName}</td>
                    <td>{person.positionEn ?? translateJobTitle(person.position, 'en') ?? person.position}</td>
                    <td className={styles.muted}>
                      {person.unitEn ?? translateJobTitle(person.unit, 'en') ?? person.unit}
                    </td>
                  </>
                ) : (
                  <>
                    <td>{person.fullName}</td>
                    <td className={styles.muted}>{person.fullNameGenitive}</td>
                    <td className={styles.muted}>{person.fullNameKk ?? person.fullName}</td>
                    <td className={styles.muted}>{person.fullNameEn ?? englishName(person.fullName)}</td>
                    <td>
                      {person.position}
                      <div className={styles.muted}>
                        {[
                          person.positionKk ?? translateJobTitle(person.position, 'kk'),
                          person.positionEn ?? translateJobTitle(person.position, 'en'),
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      </div>
                    </td>
                    <td className={styles.muted}>
                      {person.unit}
                      <div>
                        {[
                          person.unitKk ?? translateJobTitle(person.unit, 'kk'),
                          person.unitEn ?? translateJobTitle(person.unit, 'en'),
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      </div>
                    </td>
                  </>
                )}
                <td>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.link} onClick={() => setDraft(person)}>
                      {t.common.edit}
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => {
                        if (window.confirm(t.admin.personRemoveConfirm)) removeEmployee(person.id);
                      }}
                    >
                      {t.common.remove}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * Правка карточки с автоматическими переводами.
 *
 * Меняется ФИО – латиница, казахское написание и дательный падеж
 * пересобираются; меняется должность или подразделение – казахский и
 * английский берутся из словаря. Перевод, который поправили руками, не
 * затирается: пересобирается только то, что было подставлено само.
 */
function withTranslations(draft: EmployeeBrief, patch: Partial<EmployeeBrief>): EmployeeBrief {
  const next: EmployeeBrief = { ...draft, ...patch };

  const replace = <K extends keyof EmployeeBrief>(key: K, before: string, after: string) => {
    const current = draft[key];
    if (current === undefined || current === '' || current === before) {
      (next as unknown as Record<string, unknown>)[key] = after;
    }
  };

  if (patch.fullName !== undefined) {
    replace('fullNameEn', englishName(draft.fullName), englishName(patch.fullName));
    replace('fullNameKk', draft.fullName, patch.fullName);
  }
  if (patch.fullName !== undefined || patch.fullNameKk !== undefined) {
    const kkBefore = draft.fullNameKk ?? draft.fullName;
    const kkAfter = next.fullNameKk ?? next.fullName;
    replace('fullNameKkDative', kazakhDative(kkBefore), kazakhDative(kkAfter));
  }
  if (patch.position !== undefined) {
    for (const [key, lang] of [['positionKk', 'kk'], ['positionEn', 'en']] as const) {
      replace(key, translateJobTitle(draft.position, lang) ?? '', translateJobTitle(patch.position, lang) ?? '');
    }
  }
  if (patch.unit !== undefined) {
    for (const [key, lang] of [['unitKk', 'kk'], ['unitEn', 'en']] as const) {
      replace(key, translateJobTitle(draft.unit, lang) ?? '', translateJobTitle(patch.unit, lang) ?? '');
    }
  }
  return next;
}
