/**
 * Выбор компании.
 *
 * Отдельный шаг, а не выпадающий список в углу: работая в четырёх компаниях
 * группы, человек должен осознанно выбрать, от чьего имени он сейчас
 * выпускает документы.
 */
import { useNavigate } from 'react-router-dom';

import { companies } from '@/api/mock/companies';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { buildAccentPalette } from '@/theme/color';

import styles from './ChooseCompanyPage.module.css';

export default function ChooseCompanyPage() {
  const { selectCompany } = useSession();
  const navigate = useNavigate();

  function choose(companyId: string) {
    selectCompany(companyId);
    navigate('/', { replace: true });
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t.auth.companyTitle}</h1>
        <p className={styles.body}>{t.auth.companyBody}</p>

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
                  <span className={styles.mark} aria-hidden="true">
                    {company.monogram}
                  </span>
                  <span className={styles.text}>
                    <span className={styles.name}>{company.name}</span>
                    <span className={styles.meta}>{company.city} · {company.directorName}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
