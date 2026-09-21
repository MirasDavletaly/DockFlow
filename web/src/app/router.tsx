/**
 * Маршруты.
 *
 * Каждый раздел грузится лениво: разделов будет одиннадцать, и загружать их
 * все при входе — значит заставлять кадровика ждать код юридического отдела,
 * который он не откроет (CLAUDE.md, п. 6).
 */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import { RequireCompany, RequireSession } from '@/app/guards/RequireSession';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ChooseCompanyPage = lazy(() => import('@/features/auth/ChooseCompanyPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'));
const DocumentFormPage = lazy(() => import('@/features/document-form/DocumentFormPage'));
const DocumentPage = lazy(() => import('@/features/documents/DocumentPage'));
const DocumentListPage = lazy(() => import('@/features/documents/DocumentListPage'));
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/choose-company"
          element={
            <RequireSession>
              <ChooseCompanyPage />
            </RequireSession>
          }
        />

        <Route
          element={
            <RequireSession>
              <RequireCompany>
                <AppLayout />
              </RequireCompany>
            </RequireSession>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/create" element={<CatalogPage />} />
          <Route path="/create/:templateId" element={<DocumentFormPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:documentId" element={<DocumentPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
