import React, { useState, useEffect } from 'react';

interface InventorySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const InventorySearch: React.FC<InventorySearchProps> = ({
  value,
  onChange,
  placeholder = '搜索仓库、商品名称或SKU...',
  debounceMs = 300
}) => {
  const [localValue, setLocalValue] = useState(value);

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, onChange, debounceMs, value]);

  // 同步外部值变化
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  // 清空搜索
  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <div className="relative">
        {/* 搜索图标 */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 搜索输入框 */}
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="
            block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
            bg-white/50 backdrop-blur-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            placeholder-gray-500 text-gray-900
            transition-all duration-200
          "
        />

        {/* 清空按钮 */}
        {localValue && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="
                h-5 w-5 text-gray-400 hover:text-gray-600
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
              "
              title="清空搜索"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 搜索建议（可选功能，第3天实现） */}
      {localValue && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10">
          {/* TODO: 实现搜索建议下拉列表 */}
        </div>
      )}
    </div>
  );
};

export default InventorySearch;
