import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// ─────────────────────────────────────────────────────────────────
// Lazy-loaded Pages
// ─────────────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'));
const DocumentUploadPage = lazy(() => import('../pages/documents/DocumentUploadPage'));
const DocumentReviewPage = lazy(() => import('../pages/documents/DocumentReviewPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const MtKontrolPage = lazy(() => import('../pages/mt/MtKontrolPage'));
const DiscrepancyReportPage = lazy(() => import('../pages/mt/DiscrepancyReportPage'));
const Mt799Page = lazy(() => import('../pages/mt/Mt799Page'));
const Mt707Page = lazy(() => import('../pages/mt/Mt707Page'));
const Mt700ListPage = lazy(() => import('../pages/mt/Mt700ListPage'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress size={36} />
  </Box>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    // Auth routes
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
    ],
  },
  {
    // Protected app routes
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/dashboard',
            element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
          },
          {
            path: '/documents',
            element: <Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>,
          },
          {
            path: '/documents/upload',
            element: <Suspense fallback={<PageLoader />}><DocumentUploadPage /></Suspense>,
          },
          {
            path: '/documents/:id/review',
            element: <Suspense fallback={<PageLoader />}><DocumentReviewPage /></Suspense>,
          },
          {
            path: '/reports',
            element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>,
          },
          {
            path: '/mt/kontrol',
            element: <Suspense fallback={<PageLoader />}><MtKontrolPage /></Suspense>,
          },
          {
            path: '/mt/liste',
            element: <Suspense fallback={<PageLoader />}><Mt700ListPage /></Suspense>,
          },
          {
            path: '/mt/report/:id',
            element: <Suspense fallback={<PageLoader />}><DiscrepancyReportPage /></Suspense>,
          },
          {
            path: '/mt/mesajlar',
            element: <Suspense fallback={<PageLoader />}><Mt799Page /></Suspense>,
          },
          {
            path: '/mt/degisiklikler',
            element: <Suspense fallback={<PageLoader />}><Mt707Page /></Suspense>,
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
