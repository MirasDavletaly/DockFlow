/**
 * Рабочий стол.
 *
 * Первое, что видит человек после входа. Показываем не «аналитику», а то,
 * что ему сейчас делать: сначала его последние документы, потом те, которые
 * в этой компании создают чаще всего.
 *
 * Все числа здесь настоящие. «Частые документы» считаются по документам
 * компании, а не выводятся списком всех шаблонов: список шаблонов ничего не
 * говорит о том, чем эта компания на самом деле занимается.
 *
 * Реквизиты компании ушли на отдельную страницу: на рабочем столе они
 * занимали экран, а смотрят на них раз в месяц.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { templates } from '@/api/mock/templates';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { formatShortDate, partOfDay } from '@/utils/format';

import styles from './DashboardPage.module.css';

import type { DocumentRecord } from '@/api/types';

/** Сколько частых документов показываем. Больше на экран не помещается с пользой. */
const FREQUENT_LIMIT = 6;

export default function DashboardPage() {
  const { user, documents } = useSession();

  const greeting = {
    morning: t.dashboard.subtitleMorning,
    day: t.dashboard.subtitleDay,
    evening: t.dashboard.subtitleEvening,
  }[partOfDay()];

  const counters = [
    { key: 'drafts', label: t.dashboard.counters.drafts, value: countBy(documents, 'draft') },
    { key: 'saved', label: t.dashboard.counters.saved, value: countBy(documents, 'saved') },
    {
      key: 'mine',
      label: t.dashboard.counters.mine,
      value: documents.filter((d) => d.authorId === user?.id).length,
    },
  ];

  const recent = documents.slice(0, 6);

  /**
   * Частые документы считаются по видимым документам компании.
   *
   * Пока в компании ничего не создали, считать нечего — тогда показываем
   * готовые шаблоны, честно назвав это в тексте блока. Выдумывать
   * «популярность» на пустом реестре нельзя: человек примет её за факт.
   */
  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of documents) {
      counts.set(doc.templateId, (counts.get(doc.templateId) ?? 0) + 1);
    }

    if (counts.size === 0) {
      return templates.slice(0, FREQUENT_LIMIT).map((tpl) => ({ template: tpl, count: 0 }));
    }

    return [...counts.entries()]
      .map(([templateId, count]) => ({
        template: templates.find((tpl) => tpl.id === templateId),
        count,
      }))
      .filter((row): row is { template: (typeof templates)[number]; count: number } =>
        row.template !== undefined,
      )
      .sort((a, b) => b.count - a.count || a.template.title.localeCompare(b.template.title, 'ru'))
      .slice(0, FREQUENT_LIMIT);
  }, [documents]);

  const hasCounts = frequent.some((row) => row.count > 0);

  return (
    <div className={styles.page}>
      <PageHeader eyebrow={greeting} title={user?.displayName ?? t.dashboard.title} />

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
          <div className={styles.blockHead}>
            <h2 className={styles.blockTitle}>{t.dashboard.recentTitle}</h2>
            {documents.length === 0 ? null : (
              <Link className={styles.blockLink} to="/documents">
                {t.dashboard.recentAll}
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <p className={styles.blockBody}>{t.dashboard.recentEmpty}</p>
          ) : (
            <ul className={styles.recentList}>
              {recent.map((doc) => (
                <li key={doc.id}>
                  <Link className={styles.recentItem} to={`/documents/${doc.id}`}>
                    <span className={styles.recentTitle}>{doc.title}</span>
                    <span className={styles.recentSubject}>
                      {doc.subject === '' ? '' : doc.subject}
                    </span>
                    <StatusStamp status={doc.status} size="sm" />
                    <span className={`${styles.recentDate} tabular`}>
                      {formatShortDate(doc.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t.dashboard.quickTitle}</h2>
          <p className={styles.blockBody}>
            {hasCounts ? t.dashboard.quickBody : t.dashboard.quickEmptyBody}
          </p>

          <ul className={styles.quickList}>
            {frequent.map(({ template, count }) => (
              <li key={template.id}>
                <Link className={styles.quickItem} to={`/create/${template.id}`}>
                  <span className={styles.quickSeries}>{template.series}</span>
                  <span className={styles.quickText}>
                    <span className={styles.quickTitleText}>{template.title}</span>
                    <span className={styles.quickPurpose}>{template.purpose}</span>
                  </span>
                  {count === 0 ? null : (
                    <span className={styles.quickCount}>
                      <span className="tabular">{count}</span> {t.dashboard.quickTimes}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function countBy(documents: DocumentRecord[], status: DocumentRecord['status']): number {
  return documents.filter((d) => d.status === status).length;
}
