/**
 * Каталог «Создать документ».
 *
 * Показываем и готовые шаблоны, и те, что ещё готовятся. Скрывать вторые
 * нельзя: человек решит, что система его документ не поддерживает, и уйдёт
 * делать приказ в Word — ровно то, ради чего затевалась система.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { sections } from '@/api/mock/sections';
import { catalogEntries } from '@/api/mock/templates';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { t } from '@/i18n';

import styles from './CatalogPage.module.css';

import type { CatalogEntry } from '@/api/types';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const activeSection = params.get('section');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return catalogEntries.filter((entry) => {
      if (activeSection !== null && entry.sectionId !== activeSection) return false;
      if (needle === '') return true;
      return entry.title.toLowerCase().includes(needle);
    });
  }, [activeSection, query]);

  /** Группируем по разделу и подразделу — так же, как документы лежат в деле. */
  const grouped = useMemo(() => groupEntries(visible), [visible]);

  function selectSection(sectionId: string | null) {
    if (sectionId === null) {
      params.delete('section');
    } else {
      params.set('section', sectionId);
    }
    setParams(params, { replace: true });
  }

  const readyCount = visible.filter((e) => e.state === 'ready').length;

  return (
    <div className={styles.page}>
      <PageHeader
        title={t.catalog.title}
        subtitle={t.catalog.subtitle}
        actions={
          <label className={styles.searchWrap}>
            <input
              className={styles.search}
              type="search"
              value={query}
              placeholder={t.catalog.search}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t.catalog.search}
            />
          </label>
        }
      />

      <div className={styles.filters}>
        <button
          type="button"
          className={activeSection === null ? `${styles.chip} ${styles.chipActive}` : styles.chip}
          onClick={() => selectSection(null)}
        >
          {t.catalog.allSections}
        </button>
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={
              activeSection === section.id ? `${styles.chip} ${styles.chipActive}` : styles.chip
            }
            onClick={() => selectSection(section.id)}
          >
            {section.short}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>{t.catalog.nothingFound}</h2>
            <p className={styles.emptyBody}>{t.catalog.nothingFoundBody}</p>
          </div>
        ) : (
          <>
            <div className={styles.count}>
              {readyCount} {t.catalog.documentsCount}
            </div>

            {grouped.map((group) => (
              <section key={group.key} className={styles.group}>
                <h2 className={styles.groupTitle}>
                  <span className={styles.groupSection}>{group.sectionTitle}</span>
                  {group.subsectionTitle === '' ? null : (
                    <>
                      <span className={styles.groupSep} aria-hidden="true">
                        ›
                      </span>
                      <span>{group.subsectionTitle}</span>
                    </>
                  )}
                </h2>

                <ul className={styles.list}>
                  {group.entries.map((entry) =>
                    entry.state === 'ready' ? (
                      <li key={entry.id}>
                        <Link className={styles.item} to={`/create/${entry.id}`}>
                          <span className={styles.itemTitle}>{entry.title}</span>
                          <span className={styles.itemGo} aria-hidden="true">
                            →
                          </span>
                        </Link>
                      </li>
                    ) : (
                      <li key={entry.id}>
                        <div className={`${styles.item} ${styles.itemSoon}`} aria-disabled="true">
                          <span className={styles.itemTitle}>{entry.title}</span>
                          <span className={styles.soonMark}>{t.catalog.soon}</span>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface Group {
  key: string;
  sectionTitle: string;
  subsectionTitle: string;
  entries: CatalogEntry[];
}

function groupEntries(entries: CatalogEntry[]): Group[] {
  const groups = new Map<string, Group>();

  for (const entry of entries) {
    const key = `${entry.sectionId}/${entry.subsectionId}`;
    let group = groups.get(key);

    if (group === undefined) {
      const section = sections.find((s) => s.id === entry.sectionId);
      const subsection = section?.subsections.find((s) => s.id === entry.subsectionId);
      group = {
        key,
        sectionTitle: section?.title ?? entry.sectionId,
        subsectionTitle: subsection?.title ?? '',
        entries: [],
      };
      groups.set(key, group);
    }

    group.entries.push(entry);
  }

  // Готовые шаблоны — первыми внутри группы: их можно создать прямо сейчас.
  for (const group of groups.values()) {
    group.entries.sort((a, b) => {
      if (a.state !== b.state) return a.state === 'ready' ? -1 : 1;
      return a.title.localeCompare(b.title, 'ru');
    });
  }

  return [...groups.values()];
}
