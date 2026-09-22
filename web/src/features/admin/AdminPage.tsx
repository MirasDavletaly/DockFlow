/**
 * Админ-панель.
 *
 * Отдельная страница со своим входом: пароль спрашивается ещё раз, чтобы
 * в неё нельзя было попасть случайно, оставив открытой вкладку.
 *
 * Здесь администратор заводит компании, людей и учётные записи, видит все
 * документы и журнал действий. Директор той же кнопки не видит: у него своя
 * компания, и управляет он ею на обычных экранах.
 *
 * ЧЕГО ЭТА СТРАНИЦА НЕ ДЕЛАЕТ. Она не защищает. Проверка пароля идёт в
 * браузере, ограничение по адресу здесь только хранится, а исполнять его
 * будет сервер. Пока сервера нет, любой, у кого есть доступ к этому
 * браузеру, доберётся до данных через инструменты разработчика.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { can } from '@/access/policy';
import { roles } from '@/api/mock/roles';
import { sections } from '@/api/mock/sections';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { newId, resetDb } from '@/store/db';
import { MIN_PASSWORD_LENGTH } from '@/store/password';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate } from '@/utils/format';

import styles from './AdminPage.module.css';

import type { Company, EmployeeBrief, RoleId } from '@/api/types';

type Tab = 'companies' | 'users' | 'people' | 'documents' | 'audit' | 'settings';

export default function AdminPage() {
  const session = useSession();
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>('companies');

  if (!can({ user: session.user, companyId: null }, 'admin.panel')) {
    return (
      <div className={styles.denied}>
        <h1>{t.errors.noAccessTitle}</h1>
        <p>{t.errors.noAccessBody}</p>
        <Link to="/">{t.errors.notFoundAction}</Link>
      </div>
    );
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const tabs: Array<{ id: Tab; title: string }> = [
    { id: 'companies', title: t.admin.tabCompanies },
    { id: 'users', title: t.admin.tabUsers },
    { id: 'people', title: t.admin.tabPeople },
    { id: 'documents', title: t.admin.tabDocuments },
    { id: 'audit', title: t.admin.tabAudit },
    { id: 'settings', title: t.admin.tabSettings },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={t.admin.title}
        subtitle={t.admin.subtitle}
        actions={
          <button type="button" className={styles.secondary} onClick={() => setUnlocked(false)}>
            {t.admin.leave}
          </button>
        }
      />

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
            {item.title}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.warn} role="note">
          <div className={styles.warnTitle}>{t.demo.title}</div>
          <p className={styles.warnBody}>{t.demo.body}</p>
        </div>

        {tab === 'companies' ? <CompaniesTab /> : null}
        {tab === 'users' ? <UsersTab /> : null}
        {tab === 'people' ? <PeopleTab /> : null}
        {tab === 'documents' ? <DocumentsTab /> : null}
        {tab === 'audit' ? <AuditTab /> : null}
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

/* ── Компании ──────────────────────────────────────────────────────────── */

function CompaniesTab() {
  const { companies, saveCompany, removeCompany } = useSession();

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
          {companies.map((company: Company) => (
            <tr key={company.id}>
              <td>
                {company.name}
                {company.placeholder === true ? (
                  <span className={styles.badge}>{t.auth.companyPlaceholder}</span>
                ) : null}
              </td>
              <td className="tabular">{company.bin === '' ? t.company.missing : company.bin}</td>
              <td>{company.directorName === '' ? t.company.missing : company.directorName}</td>
              <td className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() => {
                    if (window.confirm(t.admin.companyRemoveConfirm)) removeCompany(company.id);
                  }}
                >
                  {t.common.remove}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ── Пользователи ──────────────────────────────────────────────────────── */

function UsersTab() {
  const { users, companies, updateUser, removeUser, setUserPassword } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === 'platform-admin').length;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionBody}>{t.admin.usersBody}</p>
        <button type="button" className={styles.primary} onClick={() => setOpen(!open)}>
          {t.admin.userAdd}
        </button>
      </div>

      {open ? (
        <NewUserForm
          onDone={(text) => {
            setMessage(text);
            setOpen(false);
          }}
        />
      ) : null}

      {message === null ? null : <p className={styles.ok}>{message}</p>}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.auth.login}</th>
            <th>{t.profile.displayName}</th>
            <th>{t.admin.userRole}</th>
            <th>{t.admin.userCompanies}</th>
            <th aria-label={t.common.edit} />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const lastAdmin = user.role === 'platform-admin' && adminCount === 1;

            return (
              <tr key={user.id}>
                <td className="tabular">{user.login}</td>
                <td>
                  {user.displayName}
                  {user.blocked === true ? (
                    <span className={styles.badge}>{t.admin.userBlocked}</span>
                  ) : null}
                </td>
                <td>{roles.find((r) => r.id === user.role)?.title ?? user.role}</td>
                <td className={styles.muted}>
                  {user.role === 'platform-admin'
                    ? t.common.all
                    : companies
                        .filter((c) => user.companyIds.includes(c.id))
                        .map((c) => c.name)
                        .join(', ') || t.common.none}
                </td>
                <td className={styles.rowActions}>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function NewUserForm({ onDone }: { onDone: (message: string) => void }) {
  const { companies, createUser } = useSession();

  const [login, setLogin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleId>('employee');
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);

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
          role,
          // Администратор работает во всех компаниях, список ему не нужен.
          companyIds: role === 'platform-admin' ? [] : companyIds,
          sectionIds: role === 'employee' ? sectionIds : [],
        }).then((result) => {
          if (!result.ok) {
            setError(t.auth.loginTaken);
            return;
          }
          onDone(t.admin.userCreated);
        });
      }}
    >
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.auth.login}</span>
          <input className={styles.input} value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.profile.displayName}</span>
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

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

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.admin.userRole}</span>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as RoleId)}
          >
            {roles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.roleNote}>{roles.find((r) => r.id === role)?.description}</p>

      {role === 'platform-admin' ? null : (
        <fieldset className={styles.check}>
          <legend className={styles.fieldLabel}>{t.admin.userCompanies}</legend>
          <div className={styles.checkList}>
            {companies.map((company) => (
              <label key={company.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={companyIds.includes(company.id)}
                  onChange={() => setCompanyIds((prev) => toggle(prev, company.id))}
                />
                {company.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {role === 'employee' ? (
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
                {section.short}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error === null ? null : (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.primary}>
        {t.common.add}
      </button>
    </form>
  );
}

/* ── Справочник людей ──────────────────────────────────────────────────── */

function PeopleTab() {
  const { companies, allEmployees, company, saveEmployee, removeEmployee } = useSession();
  const [companyId, setCompanyId] = useState(company?.id ?? companies[0]?.id ?? '');
  const [draft, setDraft] = useState<EmployeeBrief | null>(null);

  // Справочник выбранной компании. Записи другой компании сюда не попадают
  // даже у администратора: смешать их значит подставить чужого человека
  // в приказ.
  const visible = useMemo(
    () => allEmployees.filter((e) => e.companyId === companyId),
    [allEmployees, companyId],
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionBody}>{t.admin.peopleBody}</p>
        <button
          type="button"
          className={styles.primary}
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

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t.nav.company}</span>
        <select
          className={styles.input}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {draft === null ? null : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            saveEmployee({ ...draft, companyId });
            setDraft(null);
          }}
        >
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.admin.personFullName}</span>
              <input
                className={styles.input}
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
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
                onChange={(e) => setDraft({ ...draft, fullNameKk: e.target.value })}
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
                onChange={(e) => setDraft({ ...draft, position: e.target.value })}
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
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
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

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.admin.personFullName}</th>
            <th>{t.admin.personGenitive}</th>
            <th>{t.admin.personNameKk}</th>
            <th>{t.admin.personNameEn}</th>
            <th>{t.admin.personPosition}</th>
            <th>{t.admin.personUnit}</th>
            <th aria-label={t.common.remove} />
          </tr>
        </thead>
        <tbody>
          {visible.map((person) => (
            <tr key={person.id}>
              <td>{person.fullName}</td>
              <td className={styles.muted}>{person.fullNameGenitive}</td>
              <td className={styles.muted}>{person.fullNameKk ?? t.company.missing}</td>
              <td className={styles.muted}>{person.fullNameEn ?? t.company.missing}</td>
              <td>{person.position}</td>
              <td className={styles.muted}>{person.unit}</td>
              <td className={styles.rowActions}>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ── Документы ─────────────────────────────────────────────────────────── */

function DocumentsTab() {
  const { allVisibleDocuments, companies, deleteDocument } = useSession();

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.documentsBody}</p>

      {allVisibleDocuments.length === 0 ? (
        <p className={styles.muted}>{t.admin.documentsEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
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
            {allVisibleDocuments.map((doc) => (
              <tr key={doc.id} className={doc.deletedAt === undefined ? undefined : styles.gone}>
                <td>
                  <Link className={styles.link} to={`/documents/${doc.id}`}>
                    {doc.title}
                  </Link>
                </td>
                <td className={styles.muted}>
                  {companies.find((c) => c.id === doc.companyId)?.name ?? doc.companyId}
                </td>
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
                <td className={styles.rowActions}>
                  {doc.deletedAt === undefined ? (
                    <>
                      <Link className={styles.link} to={`/create/${doc.templateId}?doc=${doc.id}`}>
                        {t.common.edit}
                      </Link>
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => {
                          if (window.confirm(t.document.deleteConfirm)) deleteDocument(doc.id);
                        }}
                      >
                        {t.common.remove}
                      </button>
                    </>
                  ) : null}
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

function AuditTab() {
  const { audit } = useSession();

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.auditBody}</p>

      {audit.length === 0 ? (
        <p className={styles.muted}>{t.admin.auditEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.auditWhen}</th>
              <th>{t.admin.auditWho}</th>
              <th>{t.admin.auditWhat}</th>
              <th>{t.admin.auditTarget}</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((entry) => (
              <tr key={entry.id}>
                <td className={cx(styles.muted, 'tabular')}>
                  {formatShortDate(entry.at)} {new Date(entry.at).toTimeString().slice(0, 5)}
                </td>
                <td>{entry.userName}</td>
                <td className="tabular">{entry.event}</td>
                <td className={styles.muted}>{entry.target}</td>
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
  const [text, setText] = useState(settings.adminIpAllowList.join('\n'));
  const [saved, setSaved] = useState(false);

  return (
    <section className={styles.section}>
      <p className={styles.sectionBody}>{t.admin.settingsBody}</p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          saveSettings({
            adminIpAllowList: text
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line !== ''),
          });
          setSaved(true);
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.admin.ipTitle}</span>
          <textarea
            className={cx(styles.input, styles.textarea)}
            rows={4}
            placeholder={t.admin.ipPlaceholder}
            value={text}
            onChange={(e) => {
              setSaved(false);
              setText(e.target.value);
            }}
          />
          <span className={styles.fieldHint}>{t.admin.ipBody}</span>
        </label>

        <div className={styles.rowActions}>
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
