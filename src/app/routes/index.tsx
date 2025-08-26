import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';
import { ListsPage } from '../pages/ListsPage';
import { ListDetailPage } from '../pages/ListDetailPage';
import { AcceptInvitePage } from '../pages/AcceptInvitePage';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/lists" replace />;
  }

  return <>{children}</>;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />
        <Route
          path="/accept-invite"
          element={
            <ProtectedRoute>
              <AcceptInvitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lists"
          element={
            <ProtectedRoute>
              <Layout>
                <ListsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lists/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ListDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/lists" replace />} />
        <Route path="*" element={<Navigate to="/lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
};