import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ListsPage = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { lists, loading, error, createList } = useLists();

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      setIsCreating(true);
      await createList(newListName.trim());
      setNewListName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">買い物リスト</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新しいリスト
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <form onSubmit={handleCreateList} className="space-y-4">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-gray-700">
                リスト名
              </label>
              <input
                id="listName"
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 今週の買い物"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewListName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isCreating || !newListName.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isCreating ? '作成中...' : '作成'}
              </button>
            </div>
          </form>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">リストがありません</h3>
          <p className="text-gray-500 mb-4">最初のリストを作成して始めましょう</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            新しいリストを作成
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              to={`/lists/${list.id}`}
              className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">{list.name}</h3>
              <p className="text-sm text-gray-500">
                {list.updatedAt.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="mt-4 flex items-center text-sm text-gray-400">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                開く
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};