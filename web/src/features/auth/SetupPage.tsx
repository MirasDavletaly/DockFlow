/**
 * Первый запуск.
 *
 * В системе нет ни одной учётной записи, и завести её должен человек, а не
 * код. Именно поэтому в репозитории нет ни одного логина и ни одного пароля:
 * администратор задаёт их здесь, и в хранилище остаются только соль и хеш.
 * Ни через инструменты разработчика, ни в собранном бандле пароля нет.
 *
 * Дальше администратор заводит директоров и работников в админ-панели.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { t } from '@/i18n';
import { MIN_PASSWORD_LENGTH } from '@/store/password';
import { useSession } from '@/store/session';

import styles from './LoginPage.module.css';

import type { FormEvent } from 'react';

const MIN_LOGIN_LENGTH = 4;

export default function SetupPage() {
  const { firstRun, createFirstAdmin, signIn } = useSession();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Кто-то уже завёл администратора: на этот экран возвращаться незачем.
  if (!firstRun) return <Navigate to="/login" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (login.trim().length < MIN_LOGIN_LENGTH) {
      setError(t.auth.loginTooShort);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.auth.passwordTooShort);
      return;
    }
    if (password !== repeat) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setBusy(true);
    await createFirstAdmin({
      login,
      displayName: displayName.trim() === '' ? login.trim() : displayName,
      password,
    });
    await signIn(login, password);
    setBusy(false);

    navigate('/', { replace: true });
  }

  return (
    <main className={styles.page}>
      <aside className={styles.desk}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            DF
          </span>
          <span className={styles.brandName}>{t.app.name}</span>
        </div>
        <p className={styles.deskLine}>{t.auth.subtitle}</p>
        <div className={styles.deskFoot}>{t.app.tagline}</div>
      </aside>

      <section className={styles.sheet}>
        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
          <h1 className={styles.title}>{t.auth.setupTitle}</h1>
          <p className={styles.lead}>{t.auth.setupBody}</p>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.setupName}</span>
            <input
              className={styles.input}
              type="text"
              autoComplete="name"
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.login}</span>
            <input
              className={styles.input}
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.password}</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.passwordRepeat}</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </label>

          {error === null ? null : (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? t.auth.submitting : t.auth.setupSubmit}
          </button>

          <div className={styles.demo}>
            <div className={styles.demoTitle}>{t.demo.title}</div>
            <p className={styles.demoBody}>{t.demo.body}</p>
          </div>
        </form>
      </section>
    </main>
  );
}
