import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Toast, useToast } from './Toast';
import { analytics } from '../../lib/analytics';
import type { NotificationSettings as NotificationSettingsType } from '../types';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings = ({ isOpen, onClose }: NotificationSettingsProps) => {
  const { toast, showToast, hideToast } = useToast();
  const notifications = useNotifications();
  const [localSettings, setLocalSettings] = useState<NotificationSettingsType | null>(null);

  useEffect(() => {
    if (notifications.settings) {
      setLocalSettings(notifications.settings);
    }
  }, [notifications.settings]);

  const handleEnableNotifications = async () => {
    const success = await notifications.requestPermissionAndToken();
    
    if (success) {
      showToast('通知が有効になりました！', 'success');
      analytics.notificationEnable();
    } else {
      showToast('通知の有効化に失敗しました', 'error');
    }
  };

  const handleRemoveToken = async (token: string) => {
    const success = await notifications.removeToken(token);
    
    if (success) {
      showToast('デバイストークンを削除しました', 'success');
      analytics.notificationDisable();
    } else {
      showToast('削除に失敗しました', 'error');
    }
  };

  const handleUpdateSettings = async (updates: Partial<NotificationSettingsType>) => {
    if (!localSettings) return;
    
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    
    const success = await notifications.updateSettings(newSettings);
    
    if (success) {
      showToast('設定を更新しました', 'success');
    } else {
      showToast('設定の更新に失敗しました', 'error');
      setLocalSettings(notifications.settings); // Revert on failure
    }
  };

  if (!isOpen) return null;

  if (!notifications.isSupported) {
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
        <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
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
            {/* Basic notification toggle */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">プッシュ通知</p>
                  <p className="text-sm text-gray-600">通知を受け取る</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings?.enabled || false}
                    onChange={(e) => handleUpdateSettings({ enabled: e.target.checked })}
                    disabled={notifications.isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {localSettings?.enabled && (
              <>
                {/* Notification types */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">通知タイプ</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">リマインダー</p>
                        <p className="text-xs text-gray-600">期限のあるアイテムのリマインダー</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={localSettings?.reminders || false}
                          onChange={(e) => handleUpdateSettings({ reminders: e.target.checked })}
                          disabled={notifications.isLoading}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">担当割り当て</p>
                        <p className="text-xs text-gray-600">アイテムが割り当てられた時の通知</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={localSettings?.assignments || false}
                          onChange={(e) => handleUpdateSettings({ assignments: e.target.checked })}
                          disabled={notifications.isLoading}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Silent hours */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">サイレント時間</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">サイレント時間を有効にする</p>
                      <p className="text-xs text-gray-600">指定した時間帯は通知しません</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={localSettings?.silentHours?.enabled || false}
                        onChange={(e) => handleUpdateSettings({ 
                          silentHours: { 
                            ...localSettings?.silentHours, 
                            enabled: e.target.checked 
                          }
                        })}
                        disabled={notifications.isLoading}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {localSettings?.silentHours?.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">開始時間</label>
                        <input
                          type="time"
                          value={localSettings?.silentHours?.start || '22:00'}
                          onChange={(e) => handleUpdateSettings({ 
                            silentHours: { 
                              ...localSettings?.silentHours, 
                              start: e.target.value 
                            }
                          })}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={notifications.isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">終了時間</label>
                        <input
                          type="time"
                          value={localSettings?.silentHours?.end || '08:00'}
                          onChange={(e) => handleUpdateSettings({ 
                            silentHours: { 
                              ...localSettings?.silentHours, 
                              end: e.target.value 
                            }
                          })}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={notifications.isLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Device tokens */}
                {notifications.tokens.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">登録済みデバイス</h4>
                    <div className="space-y-2">
                      {notifications.tokens.map((token) => (
                        <div key={token.token} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm capitalize">{token.platform}</span>
                            <span className="text-xs text-gray-500">
                              {token.lastUsed.toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveToken(token.token)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            disabled={notifications.isLoading}
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Add token button */}
            {!notifications.hasActiveToken && (
              <button
                onClick={handleEnableNotifications}
                disabled={notifications.isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {notifications.isLoading ? '設定中...' : 'このデバイスで通知を受け取る'}
              </button>
            )}

            {notifications.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{notifications.error}</p>
              </div>
            )}
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