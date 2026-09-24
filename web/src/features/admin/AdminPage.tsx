/**
 * Админ-панель.
 *
 * Отдельная страница со своим входом: пароль спрашивается ещё раз, чтобы
 * в неё нельзя было попасть случайно, оставив открытой вкладку. Спрашивается
 * один раз до следующего входа – переключение языка или переход на другой
 * экран панель не закрывают («Тест день 2»).
 *
 * Панель одна на администратора и директора, а что в ней видно, решает
 * политика по правам. Администратор работает со всей группой. Директор –
 * только со своей компанией: сотрудники и их доступ, персонал, документы,
 * журнал. Списка компаний группы и настроек платформы у директора нет.
 *
 * ЧЕГО ЭТА СТРАНИЦА НЕ ДЕЛАЕТ. Она не защищает. Проверка пароля идёт в
 * браузере, ограничение по адресу здесь только хранится, а исполнять его
 * будет сервер. Пока сервера нет, любой, у кого есть доступ к этому
 * браузеру, доберётся до данных через инструменты разработчика.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  assignableRoles,
  can,
  canDeleteDocument,
  canEditDocument,
  canManageUser,
  canRestoreDocument,
  managedCompanyIds,
} from '@/access/policy';
import { roles } from '@/api/mock/roles';
import { sections } from '@/api/mock/sections';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { searchDocuments } from '@/features/documents/search';
import { lang, t } from '@/i18n';
import { companyDirector, companyName } from '@/i18n/company';
import { tc } from '@/i18n/content';
import { newId, resetDb } from '@/store/db';
import { MIN_PASSWORD_LENGTH } from '@/store/password';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatDateTime, formatShortDate } from '@/utils/format';
import { isValidAddress } from '@/utils/ip';
import { translateJobTitle } from '@/utils/jobTitles';
import { englishName, kazakhDative } from '@/utils/names';
import { matchesQuery } from '@/utils/search';

import styles from './AdminPage.module.css';

import type { Subject } from '@/access/policy';
import type { Action, AllowedAddress, Company, EmployeeBrief, RoleId, User } from '@/api/types';

type Tab = 'companies' | 'users' | 'people' | 'documents' | 'audit' | 'settings';

/** Вкладка видна тому, у кого есть право. Роль на экране не проверяется. */
const TABS: Array<{ id: Tab; action: Action; title: () => string }> = [
  { id: 'companies', action: 'company.create', title: () => t.admin.tabCompanies },
  { id: 'users', action: 'people.manage', title: () => t.admin.tabUsers },
  { id: 'people', action: 'people.manage', title: () => t.admin.tabPeople },
  { id: 'documents', action: 'documents.viewAll', title: () => t.admin.tabDocuments },
  { id: 'audit', action: 'audit.view', title: () => t.admin.tabAudit },
  { id: 'settings', action: 'settings.manage', title: () => t.admin.tabSettings },
];

interface TabProps {
  subject: Subject;
  query: string;
}

export default function AdminPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const subject: Subject = { user: session.user, companyId: session.company?.id ?? null };

  if (!can(subject, 'admin.panel')) {
    return (
      <div className={styles.denied}>
        <h1>{t.errors.noAccessTitle}</h1>
        <p>{t.errors.noAccessBody}</p>
        <Link to="/">{t.errors.notFoundAction}</Link>
      </div>
    );
  }

  if (!session.adminUnlocked) return <PasswordGate onUnlock={session.unlockAdmin} />;

  const tabs = TABS.filter((item) => can(subject, item.action));
  // Вкладка и запрос живут в адресе: переключение языка перерисовывает
  // страницу, и человек остаётся там же, где был.
  const tab = tabs.find((item) => item.id === params.get('tab'))?.id ?? tabs[0]?.id;
  const query = params.get('q') ?? '';

  function setTab(next: Tab) {
    params.set('tab', next);
    params.delete('q');
    setParams(params, { replace: true });
  }

  function setQuery(next: string) {
    if (next === '') params.delete('q');
    else params.set('q', next);
    setParams(params, { replace: true });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t.admin.title}
        subtitle={can(subject, 'company.create') ? t.admin.subtitle : t.admin.subtitleCompany}
        actions={
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              session.lockAdmin();
              navigate('/');
            }}
          >
            {t.admin.leave}
          </button>
        }
      />

      <div className={styles.tabsRow}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cx(styles.tab, tab === item.id && styles.tabActive)}
              onClick={() => setTab(item.id)}
            >
              {item.title()}
            </button>
          ))}
        </div>

        <input
          className={styles.search}
          type="search"
          value={query}
          placeholder={t.admin.search}
          aria-label={t.admin.search}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.warn} role="note">
          <div className={styles.warnTitle}>{t.demo.title}</div>
          <p className={styles.warnBody}>{t.demo.body}</p>
        </div>

        {tab === 'companies' ? <CompaniesTab subject={subject} query={query} /> : null}
        {tab === 'users' ? <UsersTab subject={subject} query={query} /> : null}
        {tab === 'people' ? <PeopleTab subject={subject} query={query} /> : null}
        {tab === 'documents' ? <DocumentsTab subject={subject} query={query} /> : null}
        {tab === 'audit' ? <AuditTab subject={subject} query={query} /> : null}
        {tab === 'settings' ? <SettingsTab /> : null}
      </div>
    </div>
  );
}

/** Повторная проверка пароля того же аккаунта: панель не открывается случайно. */
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const { confirmPassword } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className={styles.gate}>
      <form
        className={styles.gateForm}
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void confirmPassword(password).then((ok) => {
            setBusy(false);
            if (ok) onUnlock();
            else setError(true);
          });
        }}
      >
        <h1 className={styles.gateTitle}>{t.admin.confirmTitle}</h1>
        <p className={styles.gateBody}>{t.admin.confirmBody}</p>

        <input
          className={styles.input}
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => {
            setError(false);
            setPassword(e.target.value);
          }}
        />

        {error ? (
          <p className={styles.error} role="alert">
            {t.admin.confirmFailed}
          </p>
        ) : null}

        <button type="submit" className={styles.primary} disabled={busy}>
          {t.admin.confirmSubmit}
        </button>
      </form>
    </div>
  );
}

function NothingFound() {
  return <p className={styles.muted}>{t.admin.nothingFound}</p>;
}

/* ── Компании ──────────────────────────────────────────────────────────── */

function CompaniesTab({ query }: TabProps) {
  const { companies, saveCompany, removeCompany } = useSession();

  const found = companies.filter((c) =>
    matchesQuery(query, [c.name, companyName(c), c.legalName, c.bin, c.directorName, companyDirector(c), c.city]),
  );

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

/* ── Пользователи ──────────────────────────────────────────────────────── */

function roleTitle(id: RoleId): string {
  return tc(roles.find((r) => r.id === id)?.title ?? id);
}

/** Названия разделов через запятую; у директора и администратора – «все». */
function sectionNames(user: User, ids: string[]): string {
  if (user.role !== 'employee') return t.admin.userAllSections;
  const names = sections.filter((s) => ids.includes(s.id)).map((s) => tc(s.short));
  return names.length === 0 ? t.admin.userNone : names.join(', ');
}

type UserFormState = { mode: 'create' } | { mode: 'edit'; user: User };

function UsersTab({ subject, query }: TabProps) {
  const { users, companies, updateUser, removeUser, setUserPassword } = useSession();
  const [form, setForm] = useState<UserFormState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === 'platform-admin').length;
  const companyNames = (user: User) =>
    user.role === 'platform-admin'
      ? t.common.all
      : companies
          .filter((c) => user.companyIds.includes(c.id))
          .map(companyName)
          .join(', ') || t.common.none;

  const found = users.filter((u) =>
    matchesQuery(query, [u.login, u.displayName, u.position, roleTitle(u.role), companyNames(u)]),
  );

  // Список по ролям: администраторы, директора, работники («Тест день 2»).
  const groups = roles
    .map((role) => ({ role, members: found.filter((u) => u.role === role.id) }))
    .filter((group) => group.members.length > 0);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionBody}>{t.admin.usersBody}</p>
        {assignableRoles(subject).length === 0 ? null : (
          <button
            type="button"
            className={styles.primary}
            onClick={() => setForm(form?.mode === 'create' ? null : { mode: 'create' })}
          >
            {t.admin.userAdd}
          </button>
        )}
      </div>

      {form === null ? null : (
        <UserForm
          key={form.mode === 'edit' ? form.user.id : 'create'}
          subject={subject}
          state={form}
          onCancel={() => setForm(null)}
          onDone={(text) => {
            setMessage(text);
            setForm(null);
          }}
        />
      )}

      {message === null ? null : <p className={styles.ok}>{message}</p>}

      {groups.length === 0 ? <NothingFound /> : null}

      {groups.map(({ role, members }) => (
        <div key={role.id} className={styles.group}>
          <h3 className={styles.groupTitle}>
            {roleTitle(role.id)} <span className={cx(styles.muted, 'tabular')}>{members.length}</span>
          </h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.auth.login}</th>
                <th>{t.profile.displayName}</th>
                <th>{t.admin.userCompanies}</th>
                <th>{t.admin.userSections}</th>
                <th>{t.admin.userViewSections}</th>
                <th aria-label={t.common.edit} />
              </tr>
            </thead>
            <tbody>
              {members.map((user) => {
                const lastAdmin = user.role === 'platform-admin' && adminCount === 1;
                const manageable = canManageUser(subject, user);

                return (
                  <tr key={user.id}>
                    <td className="tabular">{user.login}</td>
                    <td>
                      {user.displayName}
                      {user.position === undefined || user.position === '' ? null : (
                        <div className={styles.muted}>{user.position}</div>
                      )}
                      {user.blocked === true ? (
                        <span className={styles.badge}>{t.admin.userBlocked}</span>
                      ) : null}
                    </td>
                    <td className={styles.muted}>{companyNames(user)}</td>
                    <td className={styles.muted}>{sectionNames(user, user.sectionIds)}</td>
                    <td className={styles.muted}>
                      {sectionNames(user, user.viewSectionIds ?? [])}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {manageable ? (
                          <>
                            <button
                              type="button"
                              className={styles.link}
                              onClick={() => setForm({ mode: 'edit', user })}
                            >
                              {t.admin.userAccess}
                            </button>
                            <button
                              type="button"
                              className={styles.link}
                              onClick={() => {
                                const next = window.prompt(t.admin.userResetPassword);
                                if (next === null) return;
                                if (next.length < MIN_PASSWORD_LENGTH) {
                                  setMessage(t.auth.passwordTooShort);
                                  return;
                                }
                                void setUserPassword(user.id, next).then(() =>
                                  setMessage(t.admin.userPasswordSet),
                                );
                              }}
                            >
                              {t.admin.userResetPassword}
                            </button>
                            <button
                              type="button"
                              className={styles.link}
                              onClick={() => updateUser(user.id, { blocked: user.blocked !== true })}
                            >
                              {user.blocked === true ? t.admin.userUnblock : t.admin.userBlock}
                            </button>
                            <button
                              type="button"
                              className={styles.danger}
                              disabled={lastAdmin}
                              title={lastAdmin ? t.admin.userLastAdmin : undefined}
                              onClick={() => {
                                if (window.confirm(t.admin.userRemoveConfirm)) removeUser(user.id);
                              }}
                            >
                              {t.common.remove}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

/**
 * Сотрудник: новая учётная запись или доступ существующей.
 *
 * Роли и компании в списках – только те, что человек может выдавать
 * (`assignableRoles`, `managedCompanyIds`). Сессия проверяет то же самое
 * ещё раз при сохранении.
 */
function UserForm({
  subject,
  state,
  onDone,
  onCancel,
}: {
  subject: Subject;
  state: UserFormState;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const { companies, createUser, updateUser } = useSession();
  const editing = state.mode === 'edit' ? state.user : null;

  const scope = managedCompanyIds(subject);
  const ownCompanies = companies.filter((c) => scope === null || scope.includes(c.id));
  const roleChoices = assignableRoles(subject);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(editing?.displayName ?? '');
  const [position, setPosition] = useState(editing?.position ?? '');
  const [role, setRole] = useState<RoleId>(editing?.role ?? roleChoices.at(-1) ?? 'employee');
  const [companyIds, setCompanyIds] = useState<string[]>(
    editing?.companyIds ?? (ownCompanies.length === 1 ? ownCompanies.map((c) => c.id) : []),
  );
  const [sectionIds, setSectionIds] = useState<string[]>(editing?.sectionIds ?? []);
  const [viewSectionIds, setViewSectionIds] = useState<string[]>(editing?.viewSectionIds ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function submit() {
    setError(null);

    const chosen = companyIds.filter((id) => ownCompanies.some((c) => c.id === id));
    if (role !== 'platform-admin' && chosen.length === 0) {
      setError(t.admin.userNoCompanies);
      return;
    }

    const access = {
      role,
      companyIds: role === 'platform-admin' ? [] : companyIds,
      sectionIds: role === 'employee' ? sectionIds : [],
      viewSectionIds: role === 'employee' ? viewSectionIds : [],
    };

    if (editing !== null) {
      updateUser(editing.id, { ...access, displayName, position });
      onDone(t.admin.userAccessSaved);
      return;
    }

    if (login.trim().length < 4) {
      setError(t.auth.loginTooShort);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.auth.passwordTooShort);
      return;
    }

    void createUser({
      login,
      displayName: displayName.trim() === '' ? login.trim() : displayName,
      password,
      ...access,
      ...(position.trim() === '' ? {} : { position: position.trim() }),
    }).then((result) => {
      if (!result.ok) {
        setError(result.reason === 'login-taken' ? t.auth.loginTaken : t.admin.userCreateFailed);
        return;
      }
      onDone(t.admin.userCreated);
    });
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className={styles.fieldLabel}>
        {editing === null ? t.admin.userAdd : `${t.admin.userAccessTitle}: ${editing.login}`}
      </div>

      <div className={styles.formGrid}>
        {editing === null ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t.auth.login}</span>
            <input className={styles.input} value={login} onChange={(e) => setLogin(e.target.value)} />
          </label>
        ) : null}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.profile.displayName}</span>
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.profile.position}</span>
          <input
            className={styles.input}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </label>

        {editing === null ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t.auth.password}</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        ) : null}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.admin.userRole}</span>
          <select
            className={styles.input}
            value={role}
            disabled={roleChoices.length < 2}
            onChange={(e) => setRole(e.target.value as RoleId)}
          >
            {roleChoices.map((id) => (
              <option key={id} value={id}>
                {roleTitle(id)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.roleNote}>{tc(roles.find((r) => r.id === role)?.description ?? '')}</p>

      {role === 'platform-admin' ? null : (
        <fieldset className={styles.check}>
          <legend className={styles.fieldLabel}>{t.admin.userCompanies}</legend>
          <div className={styles.checkList}>
            {ownCompanies.map((company) => (
              <label key={company.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={companyIds.includes(company.id)}
                  onChange={() => setCompanyIds((prev) => toggle(prev, company.id))}
                />
                {companyName(company)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {role === 'employee' ? (
        <>
          <fieldset className={styles.check}>
            <legend className={styles.fieldLabel}>{t.admin.userSections}</legend>
            <p className={styles.sectionBody}>{t.admin.userSectionsHint}</p>
            <div className={styles.checkList}>
              {sections.map((section) => (
                <label key={section.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={sectionIds.includes(section.id)}
                    onChange={() => setSectionIds((prev) => toggle(prev, section.id))}
                  />
                  {tc(section.short)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.check}>
            <legend className={styles.fieldLabel}>{t.admin.userViewSections}</legend>
            <p className={styles.sectionBody}>{t.admin.userViewSectionsHint}</p>
            <div className={styles.checkList}>
              {sections.map((section) => (
                <label key={section.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={viewSectionIds.includes(section.id)}
                    onChange={() => setViewSectionIds((prev) => toggle(prev, section.id))}
                  />
                  {tc(section.short)}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      {error === null ? null : (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.rowActions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className={styles.primary}>
          {editing === null ? t.common.add : t.common.save}
        </button>
      </div>
    </form>
  );
}

/* ── Персонал ──────────────────────────────────────────────────────────── */

function PeopleTab({ subject, query }: TabProps) {
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
    (e) =>
      e.companyId === companyId &&
      matchesQuery(query, [
        e.fullName,
        e.fullNameGenitive,
        e.fullNameKk,
        e.fullNameEn,
        e.position,
        e.positionKk,
        e.positionEn,
        e.unit,
      ]),
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
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personGenitive}</span>
              <input
                className={styles.input}
                value={draft.fullNameGenitive}
                onChange={(e) => setDraft({ ...draft, fullNameGenitive: e.target.value })}
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

/* ── Документы ─────────────────────────────────────────────────────────── */

function DocumentsTab({ subject, query }: TabProps) {
  const { allVisibleDocuments, companies, deleteDocument, restoreDocument } = useSession();

  const nameOf = (id: string) => {
    const found = companies.find((c) => c.id === id);
    return found === undefined ? id : companyName(found);
  };
  const found = searchDocuments(allVisibleDocuments, query, (doc) => [nameOf(doc.companyId)]);

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.documentsBody}</p>

      {allVisibleDocuments.length === 0 ? (
        <p className={styles.muted}>{t.admin.documentsEmpty}</p>
      ) : found.length === 0 ? (
        <NothingFound />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.registry.columns.number}</th>
              <th>{t.registry.columns.title}</th>
              <th>{t.nav.company}</th>
              <th>{t.registry.columns.subject}</th>
              <th>{t.registry.columns.author}</th>
              <th>{t.registry.columns.status}</th>
              <th>{t.registry.columns.created}</th>
              <th aria-label={t.common.remove} />
            </tr>
          </thead>
          <tbody>
            {found.map((doc) => (
              <tr key={doc.id} className={doc.deletedAt === undefined ? undefined : styles.gone}>
                <td className="tabular">{doc.number ?? t.registry.noNumber}</td>
                <td>
                  <Link className={styles.link} to={`/documents/${doc.id}`}>
                    {tc(doc.title)}
                  </Link>
                </td>
                <td className={styles.muted}>{nameOf(doc.companyId)}</td>
                <td>{doc.subject === '' ? t.registry.noValue : doc.subject}</td>
                <td className={styles.muted}>{doc.authorName}</td>
                <td>
                  {doc.deletedAt === undefined ? (
                    <StatusStamp status={doc.status} size="sm" />
                  ) : (
                    <span className={styles.badge}>{t.admin.documentDeleted}</span>
                  )}
                </td>
                <td className={cx(styles.muted, 'tabular')}>{formatShortDate(doc.createdAt)}</td>
                <td>
                  <div className={styles.rowActions}>
                    {canEditDocument(subject, doc) ? (
                      <Link className={styles.link} to={`/create/${doc.templateId}?doc=${doc.id}`}>
                        {t.common.edit}
                      </Link>
                    ) : null}
                    {canDeleteDocument(subject, doc) ? (
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => {
                          if (window.confirm(t.document.deleteConfirm)) deleteDocument(doc.id);
                        }}
                      >
                        {t.common.remove}
                      </button>
                    ) : null}
                    {canRestoreDocument(subject, doc) ? (
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => restoreDocument(doc.id)}
                      >
                        {t.document.restore}
                      </button>
                    ) : null}
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

/* ── Журнал действий ───────────────────────────────────────────────────── */

function AuditTab({ query }: TabProps) {
  const { audit, companies } = useSession();

  // Действие без компании – вход, настройки платформы, работа администратора
  // вне компании – помечается прочерком, а не пустой клеткой.
  const nameOf = (id: string) => {
    if (id === '') return t.registry.noValue;
    const found = companies.find((c) => c.id === id);
    return found === undefined ? id : companyName(found);
  };
  const eventName = (event: string) => t.admin.events[event] ?? event;

  const found = audit.filter((entry) =>
    matchesQuery(query, [
      formatDateTime(entry.at),
      entry.userName,
      nameOf(entry.companyId),
      eventName(entry.event),
      entry.target,
      tc(entry.target),
    ]),
  );

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.auditBody}</p>

      {audit.length === 0 ? (
        <p className={styles.muted}>{t.admin.auditEmpty}</p>
      ) : found.length === 0 ? (
        <NothingFound />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.auditWhen}</th>
              <th>{t.admin.auditWho}</th>
              <th>{t.admin.auditCompany}</th>
              <th>{t.admin.auditWhat}</th>
              <th>{t.admin.auditTarget}</th>
            </tr>
          </thead>
          <tbody>
            {found.map((entry) => (
              <tr key={entry.id}>
                <td className={cx(styles.muted, 'tabular')}>{formatDateTime(entry.at)}</td>
                <td>{entry.userName}</td>
                <td className={styles.muted}>{nameOf(entry.companyId)}</td>
                <td>{eventName(entry.event)}</td>
                <td className={styles.muted}>{tc(entry.target)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ── Настройки ─────────────────────────────────────────────────────────── */

function SettingsTab() {
  const { settings, saveSettings } = useSession();
  // Список «кому разрешено»: название и адрес в одной строке («Тест день 2»).
  const [rows, setRows] = useState<AllowedAddress[]>(settings.adminIpAllowList);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(index: number, patch: Partial<AllowedAddress>) {
    setSaved(false);
    setError(null);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.settingsBody}</p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          const filled = rows
            .map((row) => ({ ip: row.ip.trim(), name: row.name.trim() }))
            .filter((row) => row.ip !== '');
          const wrong = filled.find((row) => !isValidAddress(row.ip));
          if (wrong !== undefined) {
            setError(`${t.admin.ipInvalid} ${wrong.ip}`);
            return;
          }
          saveSettings({ adminIpAllowList: filled });
          setRows(filled);
          setSaved(true);
        }}
      >
        <div className={styles.fieldLabel}>{t.admin.ipTitle}</div>
        <p className={styles.fieldHint}>{t.admin.ipBody}</p>

        {rows.length === 0 ? <p className={styles.muted}>{t.admin.ipEmpty}</p> : null}

        {rows.map((row, index) => (
          <div key={index} className={styles.ipRow}>
            <input
              className={styles.input}
              value={row.name}
              placeholder={t.admin.ipNamePlaceholder}
              aria-label={t.admin.ipName}
              onChange={(e) => change(index, { name: e.target.value })}
            />
            <input
              className={cx(styles.input, 'tabular')}
              value={row.ip}
              placeholder={t.admin.ipPlaceholder}
              aria-label={t.admin.ipAddress}
              onChange={(e) => change(index, { ip: e.target.value })}
            />
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                setSaved(false);
                setRows((prev) => prev.filter((_, i) => i !== index));
              }}
            >
              {t.common.remove}
            </button>
          </div>
        ))}

        {error === null ? null : (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setSaved(false);
              setRows((prev) => [...prev, { ip: '', name: '' }]);
            }}
          >
            {t.admin.ipAdd}
          </button>
          {saved ? <span className={styles.ok}>{t.profile.saved}</span> : null}
          <button type="submit" className={styles.primary}>
            {t.common.save}
          </button>
        </div>
      </form>

      <div className={styles.dangerZone}>
        <div className={styles.fieldLabel}>{t.admin.resetTitle}</div>
        <p className={styles.sectionBody}>{t.admin.resetBody}</p>
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            if (window.confirm(t.admin.resetConfirm)) {
              resetDb();
              window.location.assign('/');
            }
          }}
        >
          {t.admin.resetAction}
        </button>
      </div>
    </section>
  );
}
