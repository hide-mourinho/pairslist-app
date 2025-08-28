import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useListItems } from '../hooks/useListItems';
import { useInvites } from '../hooks/useInvites';
import { useMembers } from '../hooks/useMembers';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast, useToast } from '../components/Toast';
import { MemberManagementModal } from '../components/MemberManagementModal';
import { useAuth } from '../hooks/useAuth';
import { useUserInfo, formatLastUpdated } from '../hooks/useUserInfo';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ListDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [newItemDueTime, setNewItemDueTime] = useState('');
  const [newItemRepeat, setNewItemRepeat] = useState<'none' | 'daily' | 'weekly' | 'weekdays'>('none');
  const [newItemAssignee, setNewItemAssignee] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'assigned'>('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const { items, loading, error, addItem, toggleItemCheck, deleteItem } = useListItems(id || '');
  const { createInvite } = useInvites();
  const { members } = useMembers(id || '');
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !id) return;
      
      try {
        const memberDoc = await getDoc(doc(db, `lists/${id}/members/${user.uid}`));
        if (memberDoc.exists()) {
          setIsMember(true);
          setIsOwner(memberDoc.data()?.role === 'owner');
        } else {
          setIsMember(false);
        }
      } catch (err) {
        console.error('Error checking membership:', err);
        setIsMember(false);
      }
    };

    checkMembership();
  }, [user, id]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      setIsAdding(true);
      
      let dueAt: Timestamp | null = null;
      if (newItemDueDate) {
        const dueDateTime = new Date(newItemDueDate + (newItemDueTime ? `T${newItemDueTime}` : 'T23:59'));
        dueAt = Timestamp.fromDate(dueDateTime);
      }
      
      await addItem(newItemTitle.trim(), {
        note: newItemNote.trim() || undefined,
        qty: parseInt(newItemQty) || 1,
        dueAt,
        repeat: newItemRepeat,
        assigneeUid: newItemAssignee || null,
      });
      
      setNewItemTitle('');
      setNewItemNote('');
      setNewItemQty('1');
      setNewItemDueDate('');
      setNewItemDueTime('');
      setNewItemRepeat('none');
      setNewItemAssignee('');
      setShowAdvanced(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleCheck = async (itemId: string, checked: boolean) => {
    try {
      await toggleItemCheck(itemId, !checked);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('このアイテムを削除しますか？')) return;

    try {
      await deleteItem(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleCreateInvite = async () => {
    if (!id) return;
    
    try {
      const result = await createInvite(id, true);
      setInviteUrl(result.url);
      setInviteToken(result.token);
      try {
        await navigator.clipboard.writeText(result.url);
        showToast('招待リンクをクリップボードにコピーしました！', 'success');
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
        showToast('クリップボードへのコピーに失敗しました。手動でコピーしてください。', 'error');
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      showToast('招待リンクの作成に失敗しました', 'error');
    }
  };

  if (loading || isMember === null) {
    return <LoadingSpinner />;
  }

  if (isMember === false) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">アクセス権限がありません</h3>
        <p className="text-gray-500 mb-4">このリストを表示する権限がありません。</p>
        <Link to="/lists" className="text-blue-600 hover:text-blue-800">リスト一覧に戻る</Link>
      </div>
    );
  }

  const uncheckedItems = items.filter(item => !item.checked);
  const checkedItems = items.filter(item => item.checked);
  
  const getFilteredItems = (itemList: typeof items) => {
    switch (filter) {
      case 'overdue':
        return itemList.filter(item => item.dueAt && item.dueAt.toDate() < new Date());
      case 'today':
        return itemList.filter(item => item.dueAt && 
          new Date(item.dueAt.toDate().toDateString()) === new Date(new Date().toDateString()));
      case 'assigned':
        return itemList.filter(item => item.assigneeUid === user?.uid);
      default:
        return itemList;
    }
  };
  
  const filteredUncheckedItems = getFilteredItems(uncheckedItems);
  const overdueCount = uncheckedItems.filter(item => item.dueAt && item.dueAt.toDate() < new Date()).length;
  const todayCount = uncheckedItems.filter(item => item.dueAt && 
    new Date(item.dueAt.toDate().toDateString()) === new Date(new Date().toDateString())).length;
  const assignedToMeCount = uncheckedItems.filter(item => item.assigneeUid === user?.uid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/lists"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">買い物リスト</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMemberManagement(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            メンバー
          </button>
          {isOwner && (
            <button
              onClick={() => setShowInviteDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              共有
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="アイテムを追加..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              min="1"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="数量"
            />
            <input
              type="text"
              value={newItemNote}
              onChange={(e) => setNewItemNote(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="メモ（任意）"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            詳細設定
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
                  <input
                    type="date"
                    value={newItemDueDate}
                    onChange={(e) => setNewItemDueDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限時間</label>
                  <input
                    type="time"
                    value={newItemDueTime}
                    onChange={(e) => setNewItemDueTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!newItemDueDate}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">繰り返し</label>
                  <select
                    value={newItemRepeat}
                    onChange={(e) => setNewItemRepeat(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!newItemDueDate}
                  >
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="weekdays">平日のみ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                  <select
                    value={newItemAssignee}
                    onChange={(e) => setNewItemAssignee(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">未割り当て</option>
                    {members.map((member) => (
                      <option key={member.uid} value={member.uid}>
                        {member.displayName || member.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isAdding || !newItemTitle.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isAdding ? '追加中...' : '追加'}
          </button>
        </form>
      </div>

      {uncheckedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">未購入</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'all' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                すべて ({uncheckedItems.length})
              </button>
              {overdueCount > 0 && (
                <button
                  onClick={() => setFilter('overdue')}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'overdue' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  期限切れ ({overdueCount})
                </button>
              )}
              {todayCount > 0 && (
                <button
                  onClick={() => setFilter('today')}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'today' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  今日 ({todayCount})
                </button>
              )}
              {assignedToMeCount > 0 && (
                <button
                  onClick={() => setFilter('assigned')}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'assigned' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  私のタスク ({assignedToMeCount})
                </button>
              )}
            </div>
          </div>
          {filteredUncheckedItems.map((item) => {
            const isOverdue = item.dueAt && item.dueAt.toDate() < new Date();
            const isDueToday = item.dueAt && 
              new Date(item.dueAt.toDate().toDateString()) === new Date(new Date().toDateString());
            const assignee = members.find(m => m.uid === item.assigneeUid);
            
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg shadow border flex items-center space-x-3 ${
                  isOverdue 
                    ? 'bg-red-50 border-red-200' 
                    : isDueToday 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleToggleCheck(item.id, item.checked)}
                  className={`flex-shrink-0 w-5 h-5 border-2 rounded-full hover:border-blue-500 focus:outline-none focus:border-blue-500 ${
                    isOverdue ? 'border-red-300' : isDueToday ? 'border-yellow-300' : 'border-gray-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-sm font-medium ${
                        isOverdue ? 'text-red-900' : isDueToday ? 'text-yellow-900' : 'text-gray-900'
                      }`}>
                        {item.title}
                      </h4>
                      {assignee && (
                        <div className="flex items-center space-x-1">
                          <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {(assignee.displayName || assignee.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-500">{assignee.displayName || assignee.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">×{item.qty}</span>
                      {item.dueAt && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          isOverdue 
                            ? 'bg-red-100 text-red-800' 
                            : isDueToday 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.dueAt.toDate().toLocaleDateString('ja-JP', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: item.dueAt.toDate().getHours() !== 23 || item.dueAt.toDate().getMinutes() !== 59 ? '2-digit' : undefined,
                            minute: item.dueAt.toDate().getHours() !== 23 || item.dueAt.toDate().getMinutes() !== 59 ? '2-digit' : undefined
                          })}
                        </div>
                      )}
                      {item.repeat && item.repeat !== 'none' && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {item.repeat === 'daily' ? '毎日' : 
                           item.repeat === 'weekly' ? '毎週' : 
                           item.repeat === 'weekdays' ? '平日' : item.repeat}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {item.note && <p className="text-sm text-gray-500 mt-1">{item.note}</p>}
                  <UpdatedByInfo item={item} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {checkedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">購入済み</h3>
          {checkedItems.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center space-x-3 opacity-75"
            >
              <button
                onClick={() => handleToggleCheck(item.id, item.checked)}
                className="flex-shrink-0 w-5 h-5 bg-blue-600 border-2 border-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 focus:outline-none"
              >
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-500 line-through">{item.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">×{item.qty}</span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {item.note && <p className="text-sm text-gray-400 line-through">{item.note}</p>}
                <UpdatedByInfo item={item} />
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">アイテムがありません</h3>
          <p className="text-gray-500">上のフォームから最初のアイテムを追加しましょう</p>
        </div>
      )}

      {showInviteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">リストを共有</h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  このリンクを家族や友人に送って、一緒にリストを編集できるようにしましょう
                </p>
                {inviteUrl ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-100 rounded-md">
                      <p className="text-xs text-gray-600 mb-1">招待リンク:</p>
                      <p className="text-sm font-mono break-all">{inviteUrl}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800 font-medium mb-1">招待コード（手入力用）:</p>
                      <p className="text-xl font-mono font-bold text-center bg-white px-3 py-2 rounded border text-gray-900">{inviteToken}</p>
                      <p className="text-xs text-yellow-700 mt-2">※ アプリでリンクが開けない場合は、このコードを手入力してください</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                            showToast('リンクをコピーしました！', 'success');
                          } catch (error) {
                            showToast('コピーに失敗しました', 'error');
                          }
                        }}
                        className="inline-flex justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        リンクをコピー
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteToken);
                            showToast('コードをコピーしました！', 'success');
                          } catch (error) {
                            showToast('コピーに失敗しました', 'error');
                          }
                        }}
                        className="inline-flex justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        コードをコピー
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateInvite}
                    className="w-full inline-flex justify-center px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    招待リンクを作成
                  </button>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowInviteDialog(false)}
                  className="inline-flex justify-center px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MemberManagementModal
        listId={id || ''}
        isOpen={showMemberManagement}
        onClose={() => setShowMemberManagement(false)}
        isOwner={isOwner}
        currentInviteToken={inviteToken}
      />

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

const UpdatedByInfo = ({ item }: { item: any }) => {
  const { userInfo } = useUserInfo(item.updatedBy);
  
  if (!item.updatedBy || !userInfo || item.updatedBy === item.createdBy) {
    return null;
  }
  
  return (
    <p className="text-xs text-gray-400 mt-1">
      {formatLastUpdated(item.updatedAt, item.updatedBy, userInfo)}
    </p>
  );
};