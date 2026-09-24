/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Каждый раздел грузится лениво, поэтому имена частей должны быть
    // предсказуемыми: по ним в CI проверяется бюджет размера бандла.
    chunkSizeWarningLimit: 500,
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
