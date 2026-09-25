/**
 * Каталог «Создать документ».
 *
 * Показываем и готовые шаблоны, и те, что ещё готовятся. Скрывать вторые
 * нельзя: человек решит, что система его документ не поддерживает, и уйдёт
 * делать приказ в Word — ровно то, ради чего затевалась система.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { canCreateTemplate, canEditTemplate, canUseSection } from '@/access/policy';
import { useLanguage } from '@/app/App';
import { sections } from '@/api/mock/sections';
import { catalogEntries, findTemplate } from '@/api/mock/templates';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { t } from '@/i18n';
import { documentTitle, tc } from '@/i18n/content';
import { useSession } from '@/store/session';

import styles from './CatalogPage.module.css';

import type { CatalogEntry, CustomTemplate } from '@/api/types';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const { user, company, templates } = useSession();
  const { lang } = useLanguage();
  const subject = { user, companyId: company?.id ?? null };

  const activeSection = params.get('section');

  /**
   * Разделы «по юрисдикции»: человек видит только те, которые ему открыты.
   * По умолчанию запрещено — список приходит из учётной записи, а не из
   * полного каталога с вычитанием (CLAUDE.md, п. 3.2).
   */
  const allowed = useMemo(
    () => sections.filter((section) => canUseSection(user, section.id)),
    [user],
  );

  // Шаблоны компании из конструктора («Тест день 3») стоят в каталоге рядом
  // с присланными, в своём разделе, и помечены как шаблоны компании.
  const custom = useMemo(
    () => new Map<string, CustomTemplate>(templates.map((tpl) => [tpl.id, tpl])),
    [templates],
  );
  const canCreate = allowed.some((section) => canCreateTemplate(subject, section.id));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const allowedIds = new Set(allowed.map((s) => s.id));
    const entries: CatalogEntry[] = [
      ...catalogEntries,
      ...templates.map<CatalogEntry>((tpl) => ({
        id: tpl.id,
        title: tpl.title,
        sectionId: tpl.sectionId,
        subsectionId: tpl.subsectionId,
        state: 'ready',
      })),
    ];

    return entries.filter((entry) => {
      if (!allowedIds.has(entry.sectionId)) return false;
      if (activeSection !== null && entry.sectionId !== activeSection) return false;
      if (needle === '') return true;
      // Ищем и по-русски, и на языке интерфейса: название могли запомнить
      // по бумаге, а видят его сейчас переведённым.
      return (
        entry.title.toLowerCase().includes(needle) ||
        titleOf(entry, custom).toLowerCase().includes(needle)
      );
    });
  }, [activeSection, allowed, query, templates, custom]);

  /** Группируем по разделу и подразделу — так же, как документы лежат в деле. */
  // Язык в зависимостях: заголовки групп переводятся здесь, а экран при
  // смене языка не пересоздаётся, только перерисовывается.
  const grouped = useMemo(() => groupEntries(visible, custom), [visible, custom, lang]);

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
        actions={
          <div className={styles.headerActions}>
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
            {canCreate ? (
              <Link className={styles.newTemplate} to="/templates/new">
                {t.templates.create}
              </Link>
            ) : null}
          </div>
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
        {allowed.map((section) => (
          <button
            key={section.id}
            type="button"
            className={
              activeSection === section.id ? `${styles.chip} ${styles.chipActive}` : styles.chip
            }
            onClick={() => selectSection(section.id)}
          >
            {tc(section.short)}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {allowed.length === 0 ? (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>{t.catalog.noAccess}</h2>
            <p className={styles.emptyBody}>{t.catalog.noAccessBody}</p>
          </div>
        ) : visible.length === 0 ? (
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
                  {group.entries.map((entry) => {
                    const own = custom.get(entry.id);
                    return entry.state === 'ready' ? (
                      <li key={entry.id} className={own === undefined ? undefined : styles.ownRow}>
                        <Link className={styles.item} to={`/create/${entry.id}`}>
                          <span className={styles.itemTitle}>{titleOf(entry, custom)}</span>
                          {own !== undefined ? (
                            <span className={styles.genericMark} title={t.templates.previewBody}>
                              {t.templates.catalogMark}
                            </span>
                          ) : findTemplate(entry.id)?.generic === true ? (
                            <span className={styles.genericMark} title={t.form.genericBody}>
                              {t.catalog.generic}
                            </span>
                          ) : null}
                          <span className={styles.itemGo} aria-hidden="true">
                            →
                          </span>
                        </Link>
                        {own !== undefined && canEditTemplate(subject, own) ? (
                          <Link className={styles.editTemplate} to={`/templates/${own.id}`}>
                            {t.templates.edit}
                          </Link>
                        ) : null}
                      </li>
                    ) : (
                      <li key={entry.id}>
                        <div className={`${styles.item} ${styles.itemSoon}`} aria-disabled="true">
                          <span className={styles.itemTitle}>{tc(entry.title)}</span>
                          <span className={styles.soonMark}>{t.catalog.soon}</span>
                        </div>
                      </li>
                    );
                  })}
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

/** Название строки каталога: у шаблона компании – его английское, если вписано. */
function titleOf(entry: CatalogEntry, custom: Map<string, CustomTemplate>): string {
  const own = custom.get(entry.id);
  return own === undefined ? tc(entry.title) : documentTitle(own);
}

function groupEntries(entries: CatalogEntry[], custom: Map<string, CustomTemplate>): Group[] {
  const groups = new Map<string, Group>();

  for (const entry of entries) {
    const key = `${entry.sectionId}/${entry.subsectionId}`;
    let group = groups.get(key);

    if (group === undefined) {
      const section = sections.find((s) => s.id === entry.sectionId);
      const subsection = section?.subsections.find((s) => s.id === entry.subsectionId);
      group = {
        key,
        sectionTitle: tc(section?.title ?? entry.sectionId),
        subsectionTitle: subsection === undefined ? '' : tc(subsection.title),
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
      return titleOf(a, custom).localeCompare(titleOf(b, custom), 'ru');
    });
  }

  return [...groups.values()];
}
