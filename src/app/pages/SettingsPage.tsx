import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useCallable } from '../hooks/useCallable';
import { useSubscription } from '../hooks/useSubscription';
import { Toast } from '../components/Toast';
import { NotificationSettings } from '../components/NotificationSettings';
import { Capacitor } from '@capacitor/core';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { call: requestDeletion } = useCallable<void, void>('requestAccountDeletion');
  const subscription = useSubscription();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDeleteAccount = async () => {
    if (!showFinalConfirm) {
      setShowFinalConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      await requestDeletion();
      setToast({ message: 'アカウント削除リクエストを受け付けました', type: 'success' });
      
      // ログアウトしてログインページへ
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Account deletion error:', error);
      setToast({ 
        message: error instanceof Error ? error.message : 'アカウント削除に失敗しました', 
        type: 'error' 
      });
      setIsDeleting(false);
      setShowFinalConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setShowFinalConfirm(false);
  };

  const handlePurchase = async () => {
    if (!subscription.offerings.length) {
      setToast({ message: 'サブスクリプション情報を読み込み中です', type: 'error' });
      return;
    }

    try {
      const offering = subscription.offerings[0];
      const monthlyPackage = offering.packages.find(p => p.packageType === 'MONTHLY') || offering.packages[0];
      
      if (monthlyPackage) {
        await subscription.purchase(monthlyPackage);
        setToast({ message: 'PairsList Pro にアップグレードしました！', type: 'success' });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setToast({ message: '購入に失敗しました', type: 'error' });
    }
  };

  const handleRestore = async () => {
    try {
      await subscription.restore();
      setToast({ message: '購入履歴を復元しました', type: 'success' });
    } catch (error) {
      console.error('Restore error:', error);
      setToast({ message: '復元に失敗しました', type: 'error' });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/lists')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← リストに戻る
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">設定</h1>

        {/* ユーザー情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">メールアドレス：</span>
              <span className="text-sm font-medium text-gray-900 ml-2">{user?.email}</span>
            </div>
            {user?.displayName && (
              <div>
                <span className="text-sm text-gray-600">表示名：</span>
                <span className="text-sm font-medium text-gray-900 ml-2">{user.displayName}</span>
              </div>
            )}
          </div>
        </div>

        {/* 通知設定セクション */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              リマインダー、担当割り当て、サイレント時間などの通知設定を管理できます。
            </p>
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12h6m-6 4h6m2-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5" />
              </svg>
              通知設定を開く
            </button>
          </div>
        </div>

        {/* PairsList Pro セクション */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">PairsList Pro</h2>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600">現在のプラン：</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                subscription.isPro 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {subscription.isPro ? 'Pro' : 'Free'}
              </span>
            </div>
            
            {!subscription.isPro && (
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2">Proプランで以下の制限を解除：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>リスト数制限なし（Freeは3つまで）</li>
                  <li>世帯メンバー数制限なし（Freeは5人まで）</li>
                  <li>履歴データ無制限保存（Freeは30日間）</li>
                  <li>優先サポート</li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {!subscription.isPro && Capacitor.isNativePlatform() && (
              <button
                onClick={handlePurchase}
                disabled={subscription.isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {subscription.isLoading ? '処理中...' : 'Proプランに登録'}
              </button>
            )}
            
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleRestore}
                disabled={subscription.isLoading}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {subscription.isLoading ? '処理中...' : '購入履歴を復元'}
              </button>
            )}

            {!Capacitor.isNativePlatform() && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  Proプランの購入は、iOSアプリまたはAndroidアプリからご利用いただけます。
                </p>
              </div>
            )}
          </div>

          {subscription.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{subscription.error}</p>
            </div>
          )}
        </div>

        {/* 危険ゾーン */}
        <div className="bg-white rounded-lg shadow border-2 border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">危険ゾーン</h2>
          
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                アカウントを削除すると、すべてのデータが失われます。この操作は取り消すことができません。
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                アカウントを削除
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="font-semibold text-red-900 mb-2">
                  {showFinalConfirm ? '最終確認' : '削除の影響'}
                </h3>
                
                {!showFinalConfirm ? (
                  <div className="space-y-2 text-sm text-red-800">
                    <p>アカウントを削除すると以下の影響があります：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>あなたが作成したすべてのリストが削除されます</li>
                      <li>共有しているリストから退出します</li>
                      <li>すべての個人データが完全に削除されます</li>
                      <li>7日間の猶予期間後、データの復元はできません</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                      ⚠️ 他のユーザーと共有しているリストがある場合、そのリストの所有権を譲渡する必要があります。
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-2">
                      本当にアカウントを削除しますか？
                    </p>
                    <p>
                      この操作は取り消すことができません。すべてのデータが失われます。
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '削除中...' : showFinalConfirm ? '削除を実行' : '続行'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
};