/**
 * Реестр архива в Excel («Тест день 3»).
 *
 * Выгружается ровно то, что человек видит на экране: тот же отбор по
 * источнику и поиску, те же колонки, на языке интерфейса. Список уже
 * отобран политикой (`visibleDocuments`, `visibleArchive`), поэтому чужого
 * документа в файле быть не может.
 *
 * Таблица чёрно-белая: без цвета, без плашек «Создан» / «PDF» – вместо них
 * слово в колонке «Откуда» (`utils/xlsx.ts`).
 */
import { t } from '@/i18n';
import { tc } from '@/i18n/content';
import { documentSubject, personName } from '@/i18n/person';
import { formatShortDate } from '@/utils/format';
import { XLSX_TYPE, buildXlsx } from '@/utils/xlsx';

import type { ArchiveFile, DocumentRecord } from '@/api/types';

export type RegistryRow =
  | { kind: 'document'; doc: DocumentRecord; section: string }
  | { kind: 'file'; file: ArchiveFile; section: string };

export function registryHeader(): string[] {
  const c = t.archive.columns;
  return ['№', c.number, c.title, t.registry.columns.subject, t.archive.description, c.date, c.section, c.source, c.who];
}

/** Строки таблицы в том же порядке, что на экране. */
export function registryRows(rows: RegistryRow[]): string[][] {
  return rows.map((row, index) =>
    row.kind === 'document'
      ? [
          String(index + 1),
          row.doc.number ?? t.registry.noNumber,
          tc(row.doc.title),
          documentSubject(row.doc),
          row.doc.description,
          formatShortDate(row.doc.createdAt),
          row.section,
          t.archive.filterCreated,
          personName(row.doc.authorName),
        ]
      : [
          String(index + 1),
          row.file.number ?? t.registry.noNumber,
          row.file.title,
          '',
          row.file.description,
          formatShortDate(row.file.documentDate),
          row.section,
          t.archive.filterUploaded,
          personName(row.file.uploadedByName),
        ],
  );
}

/** Имя файла без знаков, которые Windows в имени не пускает. */
export function registryFileName(companyName: string, date: string): string {
  const safe = `${t.archive.exportFileName} ${companyName} ${date}`.replace(/[\\/:*?"<>|«»]/gu, '').replace(/\s+/gu, ' ');
  return `${safe.trim()}.xlsx`;
}

export function downloadRegistry(rows: RegistryRow[], companyName: string, date: string): void {
  const bytes = buildXlsx({
    name: t.archive.exportFileName,
    header: registryHeader(),
    rows: registryRows(rows),
    widths: [5, 14, 48, 32, 30, 12, 18, 18, 24],
  });

  const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_TYPE }));
  const link = document.createElement('a');
  link.href = url;
  link.download = registryFileName(companyName, date);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
