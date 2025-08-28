import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { Capacitor } from '@capacitor/core';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  reason?: 'FREE_LIST_LIMIT' | 'FREE_MEMBER_LIMIT' | 'GENERAL';
}

export const ProUpgradeModal = ({ 
  isOpen, 
  onClose, 
  title = 'Proプランにアップグレード',
  description,
  reason = 'GENERAL'
}: ProUpgradeModalProps) => {
  const subscription = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const getReasonSpecificContent = () => {
    switch (reason) {
      case 'FREE_LIST_LIMIT':
        return {
          title: 'リスト数の上限に達しました',
          description: 'Freeプランでは3つまでのリストを作成できます。無制限にリストを作成するにはProプランにアップグレードしてください。',
          highlight: 'リスト数制限なし'
        };
      case 'FREE_MEMBER_LIMIT':
        return {
          title: 'メンバー数の上限に達しました',
          description: 'Freeプランでは1つのリストに5人までのメンバーを招待できます。無制限にメンバーを招待するにはProプランにアップグレードしてください。',
          highlight: 'メンバー数制限なし'
        };
      default:
        return {
          title,
          description: description || 'Proプランでより多くの機能をご利用いただけます。',
          highlight: 'すべての制限を解除'
        };
    }
  };

  const content = getReasonSpecificContent();

  const handlePurchase = async () => {
    if (!subscription.offerings.length) {
      return;
    }

    setIsProcessing(true);
    try {
      const offering = subscription.offerings[0];
      const monthlyPackage = offering.packages.find(p => p.packageType === 'MONTHLY') || offering.packages[0];
      
      if (monthlyPackage) {
        await subscription.purchase(monthlyPackage);
        onClose();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await subscription.restore();
      onClose();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 0c1.1 0 2 .9 2 2l0 14c0 1.1-.9 2-2 2l-14 0c-1.1 0-2-.9-2-2l0-14c0-1.1.9-2 2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 12l2 2l4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h2>
          <p className="text-gray-600">{content.description}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Proプランの特典</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className={content.highlight.includes('リスト') ? 'font-semibold' : ''}>
                リスト数制限なし（Freeは3つまで）
              </span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className={content.highlight.includes('メンバー') ? 'font-semibold' : ''}>
                メンバー数制限なし（Freeは5人まで）
              </span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              履歴データ無制限保存（Freeは30日間）
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              優先サポート
            </li>
          </ul>
        </div>

        {Capacitor.isNativePlatform() ? (
          <div className="space-y-3">
            <button
              onClick={handlePurchase}
              disabled={isProcessing || subscription.isLoading || !subscription.offerings.length}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : 'Proプランに登録'}
            </button>
            
            <button
              onClick={handleRestore}
              disabled={isProcessing || subscription.isLoading}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : '購入履歴を復元'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-800 text-center">
              Proプランの購入は、iOSアプリまたはAndroidアプリからご利用いただけます。
            </p>
          </div>
        )}

        {subscription.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{subscription.error}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  );
};