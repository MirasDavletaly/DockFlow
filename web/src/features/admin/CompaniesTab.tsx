/**
 * Вкладка «Компании»: компании группы. Видна только администратору платформы.
 *
 * Часть админ-панели (`AdminPage.tsx`): что в ней видно, решает политика по
 * правам, а не проверка роли на экране.
 */

import { t } from '@/i18n';
import { companyDirector, companyName } from '@/i18n/company';
import { newId } from '@/store/db';
import { useSession } from '@/store/session';
import { matchesQuery } from '@/utils/search';

import styles from './AdminPage.module.css';
import { companySearchFields } from './searchFields';
import { NothingFound } from './shared';

import type { Company } from '@/api/types';
import type { TabProps } from './shared';

export function CompaniesTab({ query }: TabProps) {
  const { companies, saveCompany, removeCompany } = useSession();

  const found = companies.filter((c) => matchesQuery(query, companySearchFields(c)));

  function addCompany() {
    const id = newId('c');
    saveCompany({
      id,
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
      // Реквизитов ещё нет: пометка условных данных стоит сразу, чтобы от
      // имени такой компании не выпустили документ.
      placeholder: true,
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionBody}>{t.admin.companiesBody}</p>
        <button type="button" className={styles.primary} onClick={addCompany}>
          {t.admin.companyAdd}
        </button>
      </div>

      {found.length === 0 ? (
        <NothingFound />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.company.shortName}</th>
              <th>{t.company.bin}</th>
              <th>{t.company.director}</th>
              <th aria-label={t.common.remove} />
            </tr>
          </thead>
          <tbody>
            {found.map((company: Company) => (
              <tr key={company.id}>
                <td>
                  {companyName(company)}
                  {company.placeholder === true ? (
                    <span className={styles.badge}>{t.auth.companyPlaceholder}</span>
                  ) : null}
                </td>
                <td className="tabular">{company.bin === '' ? t.company.missing : company.bin}</td>
                <td>{company.directorName === '' ? t.company.missing : companyDirector(company)}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => {
                        if (window.confirm(t.admin.companyRemoveConfirm)) removeCompany(company.id);
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
