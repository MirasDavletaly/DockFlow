/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import type { Plugin } from 'vite';

/**
 * Политика содержимого для рабочей сборки («Тест день 3»: «работать над
 * безопасностью»).
 *
 * Она не прячет данные от того, кто сидит за этим браузером: пока сервера
 * нет, всё лежит в localStorage (docs/plans/phase-01-server.md). Она
 * закрывает другое – чужой скрипт, внедрённый в страницу, не загрузится и
 * не отправит данные наружу: скрипты только свои, запросы только к своему
 * адресу. Шрифты – с Google Fonts, картинки – свои, data: и blob: (логотип
 * компании, PDF).
 *
 * Только для сборки: dev-сервер Vite вставляет в страницу встроенные скрипты
 * горячей перезагрузки, и эта политика их бы запретила.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'docflow-content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />
    <meta name="referrer" content="no-referrer" />`,
      ),
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Каждый раздел грузится лениво, поэтому имена частей должны быть
    // предсказуемыми: по ним в CI проверяется бюджет размера бандла.
    chunkSizeWarningLimit: 500,
    // Карт исходников в рабочей сборке нет: через F12 не видно исходного
    // кода с комментариями. Это не защита данных, но и лишнего не отдаём.
    sourcemap: false,
  },
  test: {
    // jsdom нужен там, где проверяется хранилище и WebCrypto: они живут
    // в браузере, а не в Node.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
  },
  optimizeDeps: {
    // Библиотеки «Скачать PDF» грузятся лениво, по кнопке. Без предварительной
    // сборки dev-сервер находил их только в момент первого нажатия, пересобирал
    // зависимости, и первое скачивание зависало. В рабочей сборке этого нет.
    include: ['jspdf', 'html2canvas-pro'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
