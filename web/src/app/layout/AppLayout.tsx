/**
 * Оболочка рабочих экранов: «стол», на котором лежит документ.
 *
 * Боковая панель тёмная и плотная — она не должна спорить с листом за
 * внимание. Всё светлое пространство справа принадлежит документу.
 */
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { can, canUseSection } from '@/access/policy';
import { sections } from '@/api/mock/sections';
import { useLanguage } from '@/app/App';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';

import styles from './AppLayout.module.css';

import type { Lang } from '@/i18n';

export function AppLayout() {
  const { company, user, companies, signOut, selectCompany } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { lang, switchTo } = useLanguage();

  if (company === null || user === null) return null;

  function handleSwitchCompany() {
    selectCompany('');
    navigate('/choose-company');
  }

  /**
   * Раздел выбран, только если он стоит в адресе.
   *
   * `NavLink` сравнивает лишь путь и не смотрит на строку запроса, поэтому
   * на `/create` подсвечивались сразу все разделы: у всех ссылок путь
   * одинаковый, а различает их `?section=`.
   */
  const activeSection = location.pathname === '/create' ? params.get('section') : null;

  const allowedSections = sections.filter((section) => canUseSection(user, section.id));
  const showAdmin = can({ user, companyId: company.id }, 'admin.panel');

  return (
    <div className={styles.shell}>
      <nav className={`${styles.rail} no-print`} aria-label={t.nav.sections}>
        <button
          type="button"
          className={styles.company}
          onClick={handleSwitchCompany}
          // Одна компания — переключать не на что, но кнопка остаётся
          // названием компании, в которой человек работает.
          disabled={companies.length < 2}
          title={companies.length < 2 ? undefined : t.nav.switchCompany}
        >
          {/* Логотип на белой подложке: в присланных файлах фон у части
              компаний прозрачный, у части белый, и на тёмной панели без
              подложки одни выглядели бы вырезанными, другие – заплаткой.
              Логотипы у группы словесные, поэтому название под ними не
              повторяется: его заменяет подпись «Компания». */}
          {company.logo === undefined ? (
            <>
              <span className={styles.companyMark} aria-hidden="true">
                {company.monogram}
              </span>
              <span className={styles.companyText}>
                <span className={styles.companyName}>{company.name}</span>
                <span className={styles.companyHint}>{t.nav.company}</span>
              </span>
            </>
          ) : (
            <span className={styles.companyText}>
              <span className={styles.companyLogoBox}>
                <img className={styles.companyLogo} src={company.logo} alt={company.name} />
              </span>
              <span className={styles.companyHint}>{t.nav.company}</span>
            </span>
          )}
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
          <li>
            <NavLink to="/company" className={navClass}>
              {t.nav.requisites}
            </NavLink>
          </li>
          {showAdmin ? (
            <li>
              <NavLink to="/admin" className={navClass}>
                {t.nav.admin}
              </NavLink>
            </li>
          ) : null}
        </ul>

        {allowedSections.length === 0 ? null : (
          <div className={styles.railGroup}>
            <div className={styles.railGroupTitle}>{t.nav.sections}</div>
            <ul className={styles.sectionNav}>
              {allowedSections.map((section) => (
                <li key={section.id}>
                  <NavLink
                    to={`/create?section=${section.id}`}
                    className={cx(
                      styles.navItem,
                      activeSection === section.id && styles.navItemActive,
                    )}
                  >
                    {section.short}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.railFooter}>
          <div className={styles.language} role="group" aria-label={t.nav.language}>
            {(['ru', 'en'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                className={cx(styles.langButton, lang === code && styles.langButtonActive)}
                onClick={() => switchTo(code)}
                aria-pressed={lang === code}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <NavLink to="/profile" className={cx(styles.user)}>
            <span className={styles.avatar} aria-hidden="true">
              {user.avatar === undefined ? (
                initials(user.displayName)
              ) : (
                <img className={styles.avatarImage} src={user.avatar} alt="" />
              )}
            </span>
            <span className={styles.userText}>
              <span className={styles.userName}>{user.displayName}</span>
              <span className={styles.userLogin}>{t.nav.profile}</span>
            </span>
          </NavLink>

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

/** Буквы в кружке, пока фотографии нет. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
