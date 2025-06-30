interface LoadingIndicatorProps {
  loadingMore: boolean;
  hasMore: boolean;
  paragraphsCount: number;
}

export function LoadingIndicator({
  loadingMore,
  hasMore,
  paragraphsCount,
}: LoadingIndicatorProps) {
  return (
    <div className="py-8 flex items-center justify-center">
      {loadingMore && (
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">
            Загрузка наступных параграфаў...
          </span>
        </div>
      )}
      {!hasMore && paragraphsCount > 0 && (
        <div className="text-center">
          <div className="text-gray-400 text-2xl mb-2">📄</div>
          <span className="text-gray-500">Канец дакумэнта</span>
        </div>
      )}
      {!hasMore && paragraphsCount === 0 && (
        <div className="text-center">
          <div className="text-gray-400 text-2xl mb-2">📝</div>
          <span className="text-gray-500">Дакумэнт пусты</span>
        </div>
      )}
    </div>
  );
}
