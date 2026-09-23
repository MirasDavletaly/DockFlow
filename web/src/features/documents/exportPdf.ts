/**
 * Скачивание документа файлом PDF без окна печати («Тест день 2»).
 *
 * Каждый лист A4 снимается в картинку и кладётся на свою страницу PDF.
 * Так файл совпадает с листом на экране до буквы, включая казахские буквы и
 * логотип, но текст в нём – изображение: выделить и найти его нельзя.
 *
 * Это копия для удобства, а не выпущенный документ. Настоящий PDF с
 * контрольной суммой собирает сервер из снимка значений (CLAUDE.md, п. 3.4) –
 * TODO(phase-04): финальный PDF на сервере. Почему так и какие были варианты –
 * docs/adr/0001-pdf-v-brauzere.md.
 *
 * Библиотеки грузятся только по нажатию кнопки: в основной сборке их нет.
 */

/** Во сколько раз крупнее экрана снимается лист: 2,5 × 96 = 240 точек на дюйм. */
const SCALE = 2.5;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function exportPdf(root: HTMLElement, fileName: string, title: string): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);

  const pages = Array.from(root.querySelectorAll<HTMLElement>('[data-page]'));
  if (pages.length === 0) throw new Error('на странице нет листа документа');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title, creator: 'DocFlow' });

  for (const [index, page] of pages.entries()) {
    const canvas = await html2canvas(page, {
      scale: SCALE,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (doc) => {
        // На экране лист уменьшен под ширину окна и отбрасывает тень. В
        // снимок идёт настоящий размер и чистая бумага.
        doc.querySelectorAll<HTMLElement>('[data-sheet-viewport]').forEach((node) => {
          node.style.transform = 'none';
        });
        doc.querySelectorAll<HTMLElement>('[data-page]').forEach((node) => {
          node.style.boxShadow = 'none';
        });
      },
    });

    if (index > 0) pdf.addPage('a4', 'portrait');

    // Лист ровно A4. Если одна строка оказалась выше листа, лист вытянут –
    // тогда снимок вписывается в страницу по высоте, а не обрезается.
    const ratio = canvas.height / canvas.width;
    const height = Math.min(A4_HEIGHT_MM, A4_WIDTH_MM * ratio);
    const width = height / ratio;

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.9),
      'JPEG',
      (A4_WIDTH_MM - width) / 2,
      0,
      width,
      height,
    );
  }

  pdf.save(fileName);
}

/** Имя файла из названия и номера: без знаков, которые запрещены в Windows. */
export function pdfFileName(title: string, number: string | null): string {
  const base = [title, number === null ? '' : `№ ${number}`].filter(Boolean).join(' ');
  const safe = base.replace(/[\\/:*?"<>|]+/gu, '-').replace(/\s+/gu, ' ').trim();
  return `${safe === '' ? 'document' : safe}.pdf`;
}
