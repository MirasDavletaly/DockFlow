/**
 * Выбор компании.
 *
 * Отдельный шаг, а не выпадающий список в углу: работая в четырёх компаниях
 * группы, человек должен осознанно выбрать, от чьего имени он сейчас
 * выпускает документы.
 */
import { useNavigate } from 'react-router-dom';

import { LanguageSwitch } from '@/components/LanguageSwitch/LanguageSwitch';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { buildAccentPalette } from '@/theme/color';

import styles from './ChooseCompanyPage.module.css';

export default function ChooseCompanyPage() {
  // Список компаний берётся из учётной записи, а не из полного справочника:
  // компания, к которой человеку не выдали доступ, не должна даже
  // упоминаться на экране (CLAUDE.md, п. 3.1).
  const { selectCompany, companies } = useSession();
  const navigate = useNavigate();

  function choose(companyId: string) {
    selectCompany(companyId);
    navigate('/', { replace: true });
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t.auth.companyTitle}</h1>
          <LanguageSwitch tone="light" />
        </div>
        <p className={styles.body}>{t.auth.companyBody}</p>

        {companies.length === 0 ? <p className={styles.body}>{t.auth.noCompanies}</p> : null}

        <ul className={styles.list}>
          {companies.map((company) => {
            const palette = buildAccentPalette(company.accent);
            return (
              <li key={company.id}>
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => choose(company.id)}
                  style={{ '--card-accent': palette.accent } as React.CSSProperties}
                >
                  {/* Компанию выбирают глазами: логотип узнают быстрее,
                      чем название. Букв хватает, пока логотипа нет. */}
                  <span
                    className={company.logo === undefined ? styles.mark : styles.markLogo}
                    aria-hidden="true"
                  >
                    {company.logo === undefined ? (
                      company.monogram
                    ) : (
                      <img className={styles.logo} src={company.logo} alt="" />
                    )}
                  </span>
                  <span className={styles.text}>
                    <span className={styles.name}>{company.name}</span>
                    <span className={styles.meta}>{company.city} · {company.directorName}</span>
                  </span>

                  {/* Вымышленные компании помечены здесь, а не только внутри:
                      выбор делается на этом экране, и знать про условные
                      реквизиты нужно до него, а не после. */}
                  {company.placeholder === true ? (
                    <span className={styles.placeholder} title={t.auth.companyPlaceholderHint}>
                      {t.auth.companyPlaceholder}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
