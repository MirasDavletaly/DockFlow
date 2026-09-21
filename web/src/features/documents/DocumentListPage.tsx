/**
 * Мои документы.
 *
 * Список свёрстан как разлинованный журнал регистрации: тонкие линейки,
 * моноширинные номера и даты в столбик. Так глаз проверяет строку по строке,
 * а не бродит по карточкам.
 */
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { formatShortDate } from '@/utils/format';

import styles from './DocumentListPage.module.css';

export default function DocumentListPage() {
  const { documents } = useSession();

  return (
    <div className={styles.page}>
      <PageHeader title={t.nav.myDocuments} />

      <div className={styles.body}>
        {documents.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyBody}>{t.dashboard.recentEmpty}</p>
            <Link className={styles.emptyAction} to="/create">
              {t.nav.create}
            </Link>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colNumber}>{t.document.meta.number}</th>
                <th>{t.document.meta.template}</th>
                <th className={styles.colStatus}>{t.document.meta.status}</th>
                <th className={styles.colDate}>{t.document.meta.created}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className={`${styles.colNumber} tabular`}>
                    {doc.number ?? <span className={styles.muted}>—</span>}
                  </td>
                  <td>
                    <Link className={styles.link} to={`/documents/${doc.id}`}>
                      {doc.title}
                    </Link>
                  </td>
                  <td className={styles.colStatus}>
                    <StatusStamp status={doc.status} size="sm" />
                  </td>
                  <td className={`${styles.colDate} tabular`}>{formatShortDate(doc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
