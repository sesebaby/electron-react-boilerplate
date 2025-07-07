import React from 'react';

interface WarehouseCardSkeletonProps {
  count?: number;
}

const WarehouseCardSkeleton: React.FC<WarehouseCardSkeletonProps> = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass-surface rounded-lg p-3 sm:p-4 min-h-[280px] sm:min-h-[320px] flex flex-col animate-pulse"
        >
          {/* 卡片头部骨架 */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <div className="h-4 sm:h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full hidden sm:block"></div>
            </div>
            <div className="ml-2 flex-shrink-0">
              <div className="h-5 w-12 bg-gray-300 rounded-full"></div>
            </div>
          </div>

          {/* 统计信息骨架 */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="text-center p-2 sm:p-3 bg-white/30 rounded-lg">
              <div className="h-5 sm:h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white/30 rounded-lg">
              <div className="h-5 sm:h-6 bg-gray-300 rounded w-12 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-8 mx-auto"></div>
            </div>
          </div>

          {/* 库存状态统计骨架 */}
          <div className="flex justify-between items-center mb-3 sm:mb-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-10"></div>
            </div>
          </div>

          {/* 产品列表骨架 */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 sm:h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
            
            <div className="space-y-1">
              {Array.from({ length: 2 }).map((_, productIndex) => (
                <div
                  key={productIndex}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="h-3 bg-gray-300 rounded w-12 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 卡片底部骨架 */}
          <div className="mt-4 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-4"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default WarehouseCardSkeleton;
