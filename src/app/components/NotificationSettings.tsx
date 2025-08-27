import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Toast, useToast } from './Toast';
import { analytics } from '../../lib/analytics';
import { 
  requestNotificationPermission, 
  getFCMToken, 
  removeDeviceToken,
  isNotificationSupported,
  setupMessageListener 
} from '../../lib/messaging';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings = ({ isOpen, onClose }: NotificationSettingsProps) => {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isEnabling, setIsEnabling] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (notificationStatus === 'granted' && user) {
      // Set up message listener for foreground notifications
      const unsubscribe = setupMessageListener((payload) => {
        const { notification } = payload;
        if (notification) {
          showToast(`${notification.title}: ${notification.body}`, 'info');
        }
      });
      
      return unsubscribe;
    }
  }, [notificationStatus, user, showToast]);

  const handleEnableNotifications = async () => {
    if (!user || !isNotificationSupported()) return;

    setIsEnabling(true);
    try {
      const permission = await requestNotificationPermission();
      
      if (permission) {
        setNotificationStatus('granted');
        const token = await getFCMToken(user.uid);
        setCurrentToken(token);
        showToast('通知が有効になりました！', 'success');
        
        // Track analytics
        analytics.notificationEnable();
      } else {
        setNotificationStatus('denied');
        showToast('通知の許可が必要です', 'error');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      showToast('通知の有効化に失敗しました', 'error');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user || !currentToken) return;

    setIsEnabling(true);
    try {
      await removeDeviceToken(user.uid, currentToken);
      setCurrentToken(null);
      showToast('通知を無効にしました', 'success');
      
      // Track analytics
      analytics.notificationDisable();
    } catch (error) {
      console.error('Error disabling notifications:', error);
      showToast('通知の無効化に失敗しました', 'error');
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isOpen) return null;

  if (!isNotificationSupported()) {
    return (
      <>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">通知設定</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">通知はサポートされていません</h3>
              <p className="text-gray-500 mb-4">
                このブラウザまたはデバイスでは通知機能をご利用いただけません。
              </p>
            </div>
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">通知設定</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="text-blue-600 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5v-5zM9 12h6m-6 4h6m2-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">プッシュ通知</h4>
              <p className="text-sm text-gray-600 mb-6">
                他のメンバーがアイテムを追加・更新した時に通知を受け取れます
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    通知状態: 
                    <span className={`ml-2 ${
                      notificationStatus === 'granted' ? 'text-green-600' : 
                      notificationStatus === 'denied' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {notificationStatus === 'granted' ? '有効' : 
                       notificationStatus === 'denied' ? '拒否' : 
                       '未設定'}
                    </span>
                  </p>
                  {currentToken && (
                    <p className="text-xs text-gray-500 mt-1">デバイス登録済み</p>
                  )}
                </div>
                
                <div className={`w-3 h-3 rounded-full ${
                  notificationStatus === 'granted' ? 'bg-green-500' : 
                  notificationStatus === 'denied' ? 'bg-red-500' : 
                  'bg-gray-400'
                }`} />
              </div>
            </div>

            {notificationStatus === 'default' || notificationStatus === 'denied' ? (
              <div className="space-y-4">
                <button
                  onClick={handleEnableNotifications}
                  disabled={isEnabling}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isEnabling ? '設定中...' : '通知を有効にする'}
                </button>

                {notificationStatus === 'denied' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      通知が拒否されています。ブラウザの設定から通知を許可してから再度お試しください。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800">
                    ✓ 通知が有効になっています。他のメンバーの活動を通知でお知らせします。
                  </p>
                </div>

                <button
                  onClick={handleDisableNotifications}
                  disabled={isEnabling}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isEnabling ? '処理中...' : '通知を無効にする'}
                </button>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>通知内容：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>アイテムの追加・更新</li>
                <li>アイテムのチェック状態変更</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
};