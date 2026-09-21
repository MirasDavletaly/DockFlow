/**
 * Рабочий стол.
 *
 * Первое, что видит человек после входа. Показываем не «аналитику», а то,
 * что ему сейчас делать: частые документы и его последние черновики.
 * Счётчики считаются по реальным документам сессии — выдуманных чисел
 * на экране нет.
 */
import { Link } from 'react-router-dom';

import { templates } from '@/api/mock/templates';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { formatShortDate, partOfDay } from '@/utils/format';

import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user, documents } = useSession();

  const greeting = {
    morning: t.dashboard.subtitleMorning,
    day: t.dashboard.subtitleDay,
    evening: t.dashboard.subtitleEvening,
  }[partOfDay()];

  const counters = [
    { key: 'drafts', label: t.dashboard.counters.drafts, value: countBy(documents, 'draft') },
    { key: 'review', label: t.dashboard.counters.review, value: countBy(documents, 'review') },
    { key: 'approved', label: t.dashboard.counters.approved, value: countBy(documents, 'approved') },
  ];

  const recent = documents.slice(0, 5);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={greeting}
        title={user?.displayName ?? t.dashboard.title}
      />

      <div className={styles.body}>
        <section className={styles.counters} aria-label={t.dashboard.title}>
          {counters.map((counter) => (
            <div key={counter.key} className={styles.counter}>
              <div className={`${styles.counterValue} tabular`}>{counter.value}</div>
              <div className={styles.counterLabel}>{counter.label}</div>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t.dashboard.quickTitle}</h2>
          <p className={styles.blockBody}>{t.dashboard.quickBody}</p>

          <ul className={styles.quickList}>
            {templates.map((template) => (
              <li key={template.id}>
                <Link className={styles.quickItem} to={`/create/${template.id}`}>
                  <span className={styles.quickSeries}>{template.series}</span>
                  <span className={styles.quickText}>
                    <span className={styles.quickTitleText}>{template.title}</span>
                    <span className={styles.quickPurpose}>{template.purpose}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t.dashboard.recentTitle}</h2>

          {recent.length === 0 ? (
            <p className={styles.blockBody}>{t.dashboard.recentEmpty}</p>
          ) : (
            <ul className={styles.recentList}>
              {recent.map((doc) => (
                <li key={doc.id}>
                  <Link className={styles.recentItem} to={`/documents/${doc.id}`}>
                    <span className={styles.recentTitle}>{doc.title}</span>
                    <StatusStamp status={doc.status} size="sm" />
                    <span className={`${styles.recentDate} tabular`}>
                      {formatShortDate(doc.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function countBy(documents: { status: string }[], status: string): number {
  return documents.filter((d) => d.status === status).length;
}
