import React from 'react';

// 基础骨架屏组件
export const SkeletonItem: React.FC<{ 
  className?: string; 
  style?: React.CSSProperties; 
}> = ({ className, style }) => (
  <div className={`animate-pulse bg-white/10 rounded-lg ${className || ''}`} style={style} />
);

// 文本骨架屏
export const SkeletonText: React.FC<{ 
  lines?: number;
  className?: string;
}> = ({ lines = 1, className }) => (
  <div className={`space-y-2 ${className || ''}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonItem 
        key={index} 
        className={`h-4 ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

// 库存列表骨架屏
export const InventoryListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <SkeletonItem className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <SkeletonItem className="h-5 w-32" />
              <SkeletonItem className="h-3 w-24" />
            </div>
          </div>
          <SkeletonItem className="h-8 w-20 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <SkeletonItem className="h-3 w-16" />
            <SkeletonItem className="h-4 w-20" />
          </div>
          <div className="space-y-1">
            <SkeletonItem className="h-3 w-16" />
            <SkeletonItem className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <SkeletonItem className="h-3 w-16" />
            <SkeletonItem className="h-4 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 图表骨架屏
export const ChartSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
    {title && (
      <div className="mb-6">
        <SkeletonItem className="h-6 w-48" />
      </div>
    )}
    
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <SkeletonItem className="h-4 w-24" />
          <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
            <SkeletonItem 
              className="h-full" 
              style={{ 
                width: `${Math.random() * 60 + 20}%`,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
              }} 
            />
          </div>
          <SkeletonItem className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

// 加载状态与进度指示
export const LoadingProgress: React.FC<{ 
  progress?: number;
  message?: string;
}> = ({ progress, message = '加载中...' }) => (
  <div className="flex flex-col items-center gap-4 p-8">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 w-16 h-16 border-4 border-white/20 rounded-full"></div>
      <div 
        className="absolute inset-0 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"
        style={{
          borderTopColor: progress !== undefined ? 'transparent' : undefined,
          transform: progress !== undefined ? `rotate(${progress * 3.6}deg)` : undefined,
          animation: progress !== undefined ? 'none' : undefined
        }}
      ></div>
      {progress !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
    
    <div className="text-center">
      <p className="text-white/80 font-medium">{message}</p>
      {progress !== undefined && (
        <div className="mt-2 w-48 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  </div>
);

// 错误状态组件
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}> = ({ 
  title = '加载失败',
  message = '数据加载过程中发生错误，请重试',
  onRetry,
  retryLabel = '重新加载'
}) => (
  <div className="text-center py-12 px-6">
    <div className="text-6xl mb-4">⚠️</div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-white/70 mb-6 max-w-md mx-auto">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-200 backdrop-blur-sm"
      >
        {retryLabel}
      </button>
    )}
  </div>
);