/**
 * Собирает список фраз, которым нужен казахский и английский перевод.
 *
 * Пять шаблонов уже стоят на трёхъязычном бланке: их текст взят из настоящих
 * документов группы. Остальные выходят на простом одноязычном листе, потому
 * что проверенного перевода для них нет, а выдумывать юридические
 * формулировки нельзя (CLAUDE.md, п. 4.9).
 *
 * Этот скрипт достаёт из таких шаблонов весь постоянный текст и складывает
 * его в `docs/translation-request.md` – файл, который можно отдать юристу или
 * переводчику. Подстановки показаны как `{поле}`: их переводить не нужно,
 * система подставит значение сама.
 *
 * Запуск: npm run translation-request
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { sections } from '../src/api/mock/sections';
import { templates } from '../src/api/mock/templates';

import type { DocBlock, DocumentTemplate, Run } from '../src/api/types';

/** Кусок текста шаблона: постоянная фраза или подстановка. */
function runsToText(runs: Run[]): string {
  return runs
    .map((run) => ('text' in run ? run.text : `{${run.field}}`))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Текст, которому действительно нужен перевод.
 *
 * Слова «ПРИКАЗ» и «ПРИКАЗЫВАЮ» сюда не попадают: их казахский и английский
 * вид известен из ваших же приказов – «Б Ұ Й Р Ы Қ / ПРИКАЗ / ORDER» и
 * «Б Ұ Й Ы Р А М Ы Н / П Р И К А З Ы В А Ю / IT IS HEREBY ORDERED:». Гонять
 * переводчика по тому, что уже переведено, незачем.
 *
 * Подписи и линии для росписи тоже не в счёт: они одинаковы во всех приказах.
 */
function phrasesOf(block: DocBlock): string[] {
  switch (block.kind) {
    case 'subtitle':
    case 'paragraph':
    case 'preamble':
    case 'basis':
      return [runsToText(block.runs)];
    case 'numbered':
      return block.items.map(runsToText);
    default:
      return [];
  }
}

function sectionTitle(id: string): string {
  return sections.find((s) => s.id === id)?.title ?? id;
}

function render(pending: DocumentTemplate[]): string {
  const lines: string[] = [];

  lines.push('# Что нужно перевести на казахский и английский');
  lines.push('');
  lines.push(
    'Файл собирается командой `npm run translation-request` в папке `web`. Руками',
    'его не правят: после правки шаблонов он пересобирается.',
  );
  lines.push('');
  lines.push(
    'Пять документов уже выходят на настоящем бланке группы в три колонки –',
    'казахскую, русскую и английскую. Их текст взят из ваших же приказов.',
    'Перечисленные ниже пока печатаются только по-русски: проверенного казахского',
    'и английского текста для них нет, а выдумывать формулировки приказа нельзя.',
  );
  lines.push('');
  lines.push('## Как это заполнять');
  lines.push('');
  lines.push(
    '- `{поле}` – подстановка. Переводить не нужно, система сама поставит туда',
    '  ФИО, дату, номер или сумму. Место `{поле}` в казахской и английской фразе',
    '  может быть другим – так и должно быть.',
    '- Отдельно нужна **ссылка на статью закона**: в ваших приказах она стоит',
    '  первой строкой («В соответствии со статьей 34 Трудового Кодекса РК...»).',
    '  Для этих документов статья неизвестна, и я её не подставлял.',
    '- Падежные окончания после `{поле}` в казахском зависят от того, как слово',
    '  читается вслух. Пишите так, как правильно для обычного случая, и отметьте,',
    '  если окончание меняется.',
  );
  lines.push('');
  lines.push(`Всего документов: **${pending.length}**.`);
  lines.push('');

  for (const tpl of pending) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${tpl.title}`);
    lines.push('');
    lines.push(`Раздел: ${sectionTitle(tpl.sectionId)}. Идентификатор: \`${tpl.id}\`.`);
    lines.push('');
    lines.push(`Назначение: ${tpl.purpose}`);
    lines.push('');
    lines.push('### Ссылка на статью закона');
    lines.push('');
    lines.push('| | |');
    lines.push('|---|---|');
    lines.push('| Казахский | |');
    lines.push('| Русский | |');
    lines.push('| Английский | |');
    lines.push('');
    lines.push('### Текст документа');
    lines.push('');

    let index = 0;
    for (const block of tpl.body) {
      for (const phrase of phrasesOf(block)) {
        if (phrase === '') continue;
        index += 1;
        lines.push(`**${index}.** ${phrase}`);
        lines.push('');
        lines.push('| | |');
        lines.push('|---|---|');
        lines.push('| Казахский | |');
        lines.push('| Английский | |');
        lines.push('');
      }
    }

    const fields = tpl.fields.map((f) => `\`${f.id}\` – ${f.label}`).join('; ');
    lines.push(`Поля этого документа: ${fields}.`);
    lines.push('');
  }

  return lines.join('\n');
}

const pending = templates.filter((tpl) => tpl.layout === 'simple');
const out = resolve(import.meta.dirname, '..', '..', 'docs', 'translation-request.md');

writeFileSync(out, render(pending), 'utf8');
console.log(`готово: ${out} (${pending.length} документов)`);
