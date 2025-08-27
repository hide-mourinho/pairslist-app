import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useInvites } from '../hooks/useInvites';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { Toast, useToast } from '../components/Toast';

export const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const { acceptInvite, loading, error } = useInvites();
  const { user, loading: authLoading } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  
  const urlToken = searchParams.get('token');

  const handleAcceptInvite = async (tokenToUse: string) => {
    if (!tokenToUse || !user || processing) return;

    try {
      setProcessing(true);
      const result = await acceptInvite(tokenToUse);
      if (result.ok) {
        setSuccess(true);
        showToast('リストに参加しました！', 'success');
        setTimeout(() => {
          if (result.listId) {
            navigate(`/lists/${result.listId}`);
          } else {
            navigate('/lists');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      showToast('招待の受け入れに失敗しました', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleAcceptInvite(manualToken.trim());
    }
  };

  useEffect(() => {
    // Auto-process URL token when user is available
    if (urlToken && user && !processing && !success) {
      handleAcceptInvite(urlToken);
    }
  }, [urlToken, user, processing, success]);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user && urlToken) {
    const returnUrl = `/accept-invite?token=${urlToken}`;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  if (loading || processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-sm text-gray-600">招待を処理中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">PairsList</h2>
          <p className="mt-2 text-sm text-gray-600">
            リストへの招待
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!user ? (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                ログインしてからリストに参加してください
              </div>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                ログイン
              </button>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error.includes('expired') ? '招待リンクの有効期限が切れています' : 
                 error.includes('not-found') ? '無効な招待リンクです' : 
                 '招待の受け入れに失敗しました'}
              </div>
              <button
                onClick={() => navigate('/lists')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                リスト一覧に戻る
              </button>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                リストに参加しました！リストページにリダイレクトします...
              </div>
            </div>
          ) : urlToken ? (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                招待を処理中です...
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">招待コードで参加</h3>
                <p className="text-sm text-gray-600">
                  招待コードを入力してリストに参加してください
                </p>
              </div>
              
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                    招待コード
                  </label>
                  <div className="mt-1">
                    <input
                      id="token"
                      name="token"
                      type="text"
                      placeholder="招待コードを入力してください"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!manualToken.trim() || processing}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {processing ? '参加中...' : 'リストに参加'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/lists')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  リスト一覧に戻る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};