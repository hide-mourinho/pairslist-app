import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useStatusBarHeight } from '../hooks/useStatusBarHeight';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const statusBarHeight = useStatusBarHeight();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div 
        className={statusBarHeight > 0 ? "" : "pt-safe"}
        style={statusBarHeight > 0 ? { paddingTop: `${statusBarHeight}px` } : {}}
      >
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">
                PairsList
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user?.displayName || user?.email}
                </span>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  設定
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};