/**
 * Оболочка рабочих экранов: «стол», на котором лежит документ.
 *
 * Боковая панель тёмная и плотная — она не должна спорить с листом за
 * внимание. Всё светлое пространство справа принадлежит документу.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { sections } from '@/api/mock/sections';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';

import styles from './AppLayout.module.css';

export function AppLayout() {
  const { company, user, signOut, selectCompany } = useSession();
  const navigate = useNavigate();

  if (company === null || user === null) return null;

  function handleSwitchCompany() {
    selectCompany('');
    navigate('/choose-company');
  }

  return (
    <div className={styles.shell}>
      <nav className={`${styles.rail} no-print`} aria-label={t.nav.sections}>
        <button type="button" className={styles.company} onClick={handleSwitchCompany}>
          <span className={styles.companyMark} aria-hidden="true">
            {company.monogram}
          </span>
          <span className={styles.companyText}>
            <span className={styles.companyName}>{company.name}</span>
            <span className={styles.companyHint}>{t.nav.company}</span>
          </span>
        </button>

        <NavLink to="/create" className={cx(styles.primary)}>
          <span className={styles.primaryPlus} aria-hidden="true">
            +
          </span>
          {t.nav.create}
        </NavLink>

        <ul className={styles.mainNav}>
          <li>
            <NavLink to="/" end className={navClass}>
              {t.dashboard.title}
            </NavLink>
          </li>
          <li>
            <NavLink to="/documents" className={navClass}>
              {t.nav.myDocuments}
            </NavLink>
          </li>
        </ul>

        <div className={styles.railGroup}>
          <div className={styles.railGroupTitle}>{t.nav.sections}</div>
          <ul className={styles.sectionNav}>
            {sections.map((section) => (
              <li key={section.id}>
                <NavLink to={`/create?section=${section.id}`} className={navClass}>
                  {section.short}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.railFooter}>
          <div className={styles.user}>
            <span className={styles.userName}>{user.displayName}</span>
            <span className={styles.userLogin}>{user.login}</span>
          </div>
          <button type="button" className={styles.logout} onClick={signOut}>
            {t.nav.logout}
          </button>
        </div>
      </nav>

      <div className={styles.work}>
        <Outlet />
      </div>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return cx(styles.navItem, isActive && styles.navItemActive);
}
