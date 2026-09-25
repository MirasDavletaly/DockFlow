/**
 * Выгрузка реестра в Excel («Тест день 3»). Проверяется то, что легко
 * сломать незаметно: контрольная сумма zip, экранирование текста,
 * казахские буквы и то, что таблица чёрно-белая.
 */
import { describe, expect, it } from 'vitest';

import { buildXlsx, columnName, crc32 } from './xlsx';

const decoder = new TextDecoder();

/** Читает zip без сжатия обратно: имя файла – содержимое и его CRC. */
function unzip(bytes: Uint8Array): Map<string, { text: string; crc: number }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, { text: string; crc: number }>();
  let at = 0;

  while (view.getUint32(at, true) === 0x04034b50) {
    expect(view.getUint16(at + 8, true)).toBe(0); // без сжатия
    const crc = view.getUint32(at + 14, true);
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength));
    const data = bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size);

    expect(crc32(data), name).toBe(crc);
    files.set(name, { text: decoder.decode(data), crc });
    at += 30 + nameLength + size;
  }
  return files;
}

describe('zip', () => {
  it('CRC-32 совпадает с эталонным значением', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('колонки называются как в Excel', () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']);
  });
});

describe('реестр в Excel', () => {
  const bytes = buildXlsx({
    name: 'Реестр документов',
    header: ['Номер', 'Документ', 'Для кого'],
    rows: [
      ['07-К', 'Приказ «О приёме» <черновик> & Co', 'Жақсылықова Динара'],
      ['', 'Без номера\u0001', ''],
    ],
    widths: [12, 40, 30],
  });
  const files = unzip(bytes);
  const sheet = files.get('xl/worksheets/sheet1.xml')?.text ?? '';

  it('в книге все части, которые нужны Excel', () => {
    expect([...files.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);
    // Оглавление архива на месте: без него Excel файл не откроет.
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(6);
  });

  it('текст экранирован, казахские буквы сохранены, номер остался текстом', () => {
    expect(sheet).toContain('Приказ «О приёме» &lt;черновик&gt; &amp; Co');
    expect(sheet).toContain('Жақсылықова Динара');
    expect(sheet).toContain('<t xml:space="preserve">07-К</t>');
    expect(sheet).not.toContain('\u0001');
    expect(sheet).not.toContain('t="n"');
  });

  it('заголовок полужирным, строки – обычным, у всех тонкая рамка', () => {
    expect(sheet).toContain('<c r="A1" s="2" t="inlineStr">');
    expect(sheet).toContain('<c r="B2" s="1" t="inlineStr">');
    expect(sheet).toContain('<c r="C3" s="1" t="inlineStr">');
  });

  it('чёрно-белая: ни заливки, ни цветного текста', () => {
    const styles = files.get('xl/styles.xml')?.text ?? '';
    expect(styles).not.toMatch(/patternType="solid"/u);
    expect(styles).not.toMatch(/fgColor|bgColor/u);
    const colors = [...styles.matchAll(/rgb="([0-9A-F]{8})"/gu)].map((m) => m[1]);
    expect(new Set(colors)).toEqual(new Set(['FF000000']));
  });

  it('имя листа – как задано', () => {
    expect(files.get('xl/workbook.xml')?.text).toContain('name="Реестр документов"');
  });
});
