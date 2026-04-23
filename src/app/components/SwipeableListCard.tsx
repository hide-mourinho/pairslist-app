import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ShoppingList } from '../types';

const DELETE_WIDTH = 80;
const SNAP_THRESHOLD = DELETE_WIDTH * 0.45;

interface Props {
  list: ShoppingList;
  onDelete: (id: string) => Promise<void>;
}

export const SwipeableListCard = ({ list, onDelete }: Props) => {
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

  // Keep offsetRef in sync for use in native event handler
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Non-passive touchmove to allow preventDefault during horizontal swipe
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
    if (didDrag.current) {
      e.preventDefault();
      return;
    }
    if (offsetRef.current < 0) {
      e.preventDefault();
      setAnimated(true);
      setOffset(0);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(list.id);
    } catch {
      setIsDeleting(false);
      setAnimated(true);
      setOffset(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg shadow border border-gray-200"
    >
      {/* Delete button (revealed by swipe) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
        style={{ width: DELETE_WIDTH }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-full flex flex-col items-center justify-center text-white gap-1"
          aria-label="リストを削除"
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

      {/* Card (slides left on swipe) */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animated ? 'transform 0.2s ease' : 'none',
        }}
        onTransitionEnd={() => setAnimated(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="group relative"
      >
        <Link
          to={`/lists/${list.id}`}
          onClick={handleCardClick}
          draggable={false}
          className="block bg-white p-6 hover:shadow-md transition-shadow duration-200"
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
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
          disabled={isDeleting}
          aria-label="リストを削除"
          className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 focus:outline-none z-10"
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
