import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMembers, type Member } from '../hooks/useMembers';
import { Toast, useToast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';

interface MemberManagementModalProps {
  listId: string;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  currentInviteToken?: string;
}

export const MemberManagementModal = ({
  listId,
  isOpen,
  onClose,
  isOwner,
  currentInviteToken,
}: MemberManagementModalProps) => {
  const { user } = useAuth();
  const { members, loading, error, updateMemberRole, removeMember, leaveList, revokeInvite } = useMembers(listId);
  const { toast, showToast, hideToast } = useToast();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateRole = async (member: Member, newRole: 'owner' | 'editor') => {
    if (!confirm(`${member.displayName}の権限を${newRole === 'owner' ? 'オーナー' : '編集者'}に変更しますか？`)) {
      return;
    }

    setProcessingAction(`role-${member.uid}`);
    try {
      await updateMemberRole(member.uid, newRole);
      showToast('権限を更新しました', 'success');
    } catch (error: any) {
      const message = error?.message || '権限の更新に失敗しました';
      if (message.includes('last owner')) {
        showToast('最後のオーナーは変更できません', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`${member.displayName}をリストから削除しますか？`)) {
      return;
    }

    setProcessingAction(`remove-${member.uid}`);
    try {
      await removeMember(member.uid);
      showToast('メンバーを削除しました', 'success');
    } catch (error: any) {
      const message = error?.message || 'メンバーの削除に失敗しました';
      if (message.includes('last owner')) {
        showToast('最後のオーナーは削除できません', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleLeaveList = async () => {
    if (!confirm('このリストから退出しますか？')) {
      return;
    }

    setProcessingAction('leave');
    try {
      await leaveList();
      showToast('リストから退出しました', 'success');
      onClose();
    } catch (error: any) {
      const message = error?.message || 'リストからの退出に失敗しました';
      if (message.includes('last owner')) {
        showToast('最後のオーナーは退出できません', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRevokeInvite = async () => {
    if (!currentInviteToken) return;
    
    if (!confirm('現在の招待リンクを無効化しますか？')) {
      return;
    }

    setProcessingAction('revoke');
    try {
      await revokeInvite(currentInviteToken);
      showToast('招待リンクを無効化しました', 'success');
    } catch (error: any) {
      showToast('招待リンクの無効化に失敗しました', 'error');
    } finally {
      setProcessingAction(null);
    }
  };

  const ownerCount = members.filter(m => m.role === 'owner').length;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">メンバー管理</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  メンバー数: {members.length}人 (オーナー: {ownerCount}人)
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div key={member.uid} className="py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.displayName}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {member.displayName?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.displayName}
                          {member.uid === user?.uid && <span className="ml-2 text-xs text-gray-500">(自分)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                        <p className="text-xs text-gray-400">
                          参加日: {member.joinedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.role === 'owner' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role === 'owner' ? 'オーナー' : '編集者'}
                      </span>

                      {isOwner && member.uid !== user?.uid && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleUpdateRole(member, member.role === 'owner' ? 'editor' : 'owner')}
                            disabled={processingAction === `role-${member.uid}` || 
                                    (member.role === 'owner' && ownerCount <= 1)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title={member.role === 'owner' ? '編集者に変更' : 'オーナーに変更'}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleRemoveMember(member)}
                            disabled={processingAction === `remove-${member.uid}` || 
                                    (member.role === 'owner' && ownerCount <= 1)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="メンバーを削除"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                {isOwner && currentInviteToken && (
                  <button
                    onClick={handleRevokeInvite}
                    disabled={processingAction === 'revoke'}
                    className="w-full px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md disabled:opacity-50"
                  >
                    {processingAction === 'revoke' ? '処理中...' : '現在の招待リンクを無効化'}
                  </button>
                )}

                <button
                  onClick={handleLeaveList}
                  disabled={processingAction === 'leave' || 
                          (members.find(m => m.uid === user?.uid)?.role === 'owner' && ownerCount <= 1)}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md disabled:opacity-50"
                >
                  {processingAction === 'leave' ? '処理中...' : 'リストから退出'}
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
    </>
  );
};