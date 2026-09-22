/**
 * Приложение вообще запускается.
 *
 * Тест дешёвый и ловит дорогое: сломанный порядок хуков, неверный элемент
 * разметки, обращение к словарю, которого нет. Ни сборка, ни `tsc` этого
 * не видят – они проверяют типы, а не то, что страница отрисовалась.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from './App';
import { resetDb } from '@/store/db';

import type { Root } from 'react-dom/client';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetDb();

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/**
 * Отрисовка и ожидание.
 *
 * Каждый экран грузится лениво, поэтому после первого прохода страница ещё
 * пуста: ждём, пока часть кода доедет и отрисуется.
 */
async function render() {
  await act(async () => {
    root.render(<App />);
  });

  for (let attempt = 0; attempt < 50 && container.textContent === ''; attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

describe('запуск', () => {
  it('на чистом браузере ведёт на экран первого запуска, а не на вход', async () => {
    window.history.pushState({}, '', '/');
    await render();

    expect(container.textContent).toContain('Первый запуск');
    // Ни одного логина и ни одного пароля в собранной странице нет.
    expect(container.textContent).not.toContain('Демонстрационный вход');
  });

  it('честно называет границу: проверка идёт в браузере', async () => {
    window.history.pushState({}, '', '/setup');
    await render();

    expect(container.textContent).toContain('Проверка пароля идёт в браузере');
  });

  it('неизвестный адрес не роняет страницу', async () => {
    window.history.pushState({}, '', '/такого-адреса-нет');
    await render();

    expect(container.textContent).toContain('Страница не найдена');
  });
});
