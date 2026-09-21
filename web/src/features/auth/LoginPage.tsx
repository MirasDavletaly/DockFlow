/**
 * Вход.
 *
 * Слева — «стол»: тёмная половина с именем системы. Справа — белый лист с
 * формой. Тот же приём, что и на рабочих экранах, поэтому человек узнаёт
 * систему ещё до того, как вошёл.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { t } from '@/i18n';
import { useSession } from '@/store/session';

import styles from './LoginPage.module.css';

import type { FormEvent } from 'react';

const MIN_LENGTH = 4;

export default function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Ответ одинаковый независимо от того, что именно не так: по разнице
    // в сообщениях подбирают существующие логины (CLAUDE.md, п. 3.8).
    if (login.trim().length < MIN_LENGTH || password.length < MIN_LENGTH) {
      setFailed(true);
      return;
    }

    setBusy(true);
    setFailed(false);
    signIn(login.trim());
    navigate('/choose-company', { replace: true });
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
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h1 className={styles.title}>{t.auth.title}</h1>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.login}</span>
            <input
              className={styles.input}
              type="text"
              name="login"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
            <span className={styles.hint}>{t.auth.loginHint}</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t.auth.password}</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {failed ? (
            <p className={styles.error} role="alert">
              {t.auth.failed}
            </p>
          ) : null}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? t.auth.submitting : t.auth.submit}
          </button>

          <div className={styles.demo}>
            <div className={styles.demoTitle}>{t.auth.demoTitle}</div>
            <p className={styles.demoBody}>{t.auth.demoBody}</p>
          </div>
        </form>
      </section>
    </main>
  );
}
