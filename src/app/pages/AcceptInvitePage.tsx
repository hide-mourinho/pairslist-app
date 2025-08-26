import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvites } from '../hooks/useInvites';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const { acceptInvite, loading, error } = useInvites();
  
  const token = searchParams.get('token');

  useEffect(() => {
    const handleAcceptInvite = async () => {
      if (!token) return;

      try {
        const result = await acceptInvite(token);
        if (result.ok) {
          setSuccess(true);
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
      }
    };

    if (token) {
      handleAcceptInvite();
    }
  }, [token, acceptInvite, navigate]);

  if (loading) {
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
          {!token ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                無効な招待リンクです
              </div>
              <button
                onClick={() => navigate('/lists')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                リスト一覧に戻る
              </button>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
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
          ) : (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                招待を処理中です...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};