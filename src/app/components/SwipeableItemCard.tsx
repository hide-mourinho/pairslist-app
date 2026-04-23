import { useState, useRef, useEffect } from 'react';
import type { ShoppingItem } from '../types';
import type { Member } from '../hooks/useMembers';
import { useUserInfo, formatLastUpdated } from '../hooks/useUserInfo';

const DELETE_WIDTH = 80;
const SNAP_THRESHOLD = DELETE_WIDTH * 0.45;

interface Props {
  item: ShoppingItem;
  members: Member[];
  currentUserId?: string;
  onToggleCheck: () => void;
  onDelete: () => Promise<void>;
}

const UpdatedByInfo = ({ item }: { item: ShoppingItem }) => {
  const { userInfo } = useUserInfo(item.updatedBy);
  if (!item.updatedBy || !userInfo || item.updatedBy === item.createdBy) return null;
  return (
    <p className="text-xs text-gray-400 mt-1">
      {formatLastUpdated(item.updatedAt, item.updatedBy, userInfo)}
    </p>
  );
};

export const SwipeableItemCard = ({ item, members, onToggleCheck, onDelete }: Props) => {
  const [offset, setOffset] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const dragDir = useRef<'h' | 'v' | null>(null);
  const didDrag = useRef(false);
  const offsetRef = useRef(0);

  useEffect(() => { offsetRef.current = offset; }, [offset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (dragDir.current === 'h') e.preventDefault();
    };
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => el.removeEventListener('touchmove', prevent);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startOffset.current = offsetRef.current;
    dragDir.current = null;
    didDrag.current = false;
    setAnimated(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (dragDir.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragDir.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      return;
    }
    if (dragDir.current !== 'h') return;
    didDrag.current = true;
    const next = Math.min(0, Math.max(-DELETE_WIDTH, startOffset.current + dx));
    setOffset(next);
  };

  const onTouchEnd = () => {
    if (dragDir.current !== 'h') return;
    setAnimated(true);
    setOffset(offsetRef.current < -SNAP_THRESHOLD ? -DELETE_WIDTH : 0);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (didDrag.current) { e.preventDefault(); return; }
    if (offsetRef.current < 0) {
      e.preventDefault();
      setAnimated(true);
      setOffset(0);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch {
      setIsDeleting(false);
      setAnimated(true);
      setOffset(0);
    }
  };

  const isOverdue = item.dueAt && item.dueAt.toDate() < new Date();
  const isDueToday = item.dueAt &&
    item.dueAt.toDate().toDateString() === new Date().toDateString();
  const assignee = members.find(m => m.uid === item.assigneeUid);

  const cardBg = item.checked
    ? 'bg-gray-50 opacity-75'
    : isOverdue
    ? 'bg-red-50'
    : isDueToday
    ? 'bg-yellow-50'
    : 'bg-white';

  const borderColor = item.checked
    ? 'border-gray-200'
    : isOverdue
    ? 'border-red-200'
    : isDueToday
    ? 'border-yellow-200'
    : 'border-gray-200';

  const checkBorderColor = item.checked
    ? 'border-blue-600 bg-blue-600'
    : isOverdue
    ? 'border-red-300'
    : isDueToday
    ? 'border-yellow-300'
    : 'border-gray-300';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg shadow border ${borderColor}`}
    >
      {/* Delete button revealed by swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
        style={{ width: DELETE_WIDTH }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-full flex flex-col items-center justify-center text-white gap-1"
          aria-label="削除"
        >
          {isDeleting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs font-medium">削除</span>
            </>
          )}
        </button>
      </div>

      {/* Card content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animated ? 'transform 0.2s ease' : 'none',
        }}
        onTransitionEnd={() => setAnimated(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        className={`group ${cardBg} p-4 flex items-center space-x-3`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCheck(); }}
          className={`flex-shrink-0 w-5 h-5 border-2 rounded-full focus:outline-none ${checkBorderColor} ${
            item.checked ? 'flex items-center justify-center hover:bg-blue-700' : 'hover:border-blue-500'
          }`}
        >
          {item.checked && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <h4 className={`text-sm font-medium truncate ${
                item.checked
                  ? 'text-gray-500 line-through'
                  : isOverdue
                  ? 'text-red-900'
                  : isDueToday
                  ? 'text-yellow-900'
                  : 'text-gray-900'
              }`}>
                {item.title}
              </h4>
              {assignee && !item.checked && (
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {(assignee.displayName || assignee.email || '?')[0].toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting}
                aria-label="削除"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 focus:outline-none"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
              <span className={`text-sm ${item.checked ? 'text-gray-400' : 'text-gray-500'}`}>
                ×{item.qty ?? 1}
              </span>
              {item.dueAt && !item.checked && (
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
                    minute: item.dueAt.toDate().getHours() !== 23 || item.dueAt.toDate().getMinutes() !== 59 ? '2-digit' : undefined,
                  })}
                </div>
              )}
              {item.repeat && item.repeat !== 'none' && !item.checked && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {item.repeat === 'daily' ? '毎日' : item.repeat === 'weekly' ? '毎週' : '平日'}
                </div>
              )}
            </div>
          </div>
          {item.note && (
            <p className={`text-sm mt-1 ${item.checked ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
              {item.note}
            </p>
          )}
          <UpdatedByInfo item={item} />
        </div>
      </div>
    </div>
  );
};
