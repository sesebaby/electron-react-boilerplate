import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcherTailwind: React.FC<ThemeSwitcherProps> = ({ className }) => {
  const { currentTheme, switchTheme, availableThemes, getCurrentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const themeSwitcherRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭主题选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSwitcherRef.current && !themeSwitcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleThemeSelect = (themeName: string) => {
    switchTheme(themeName as any);
    setIsOpen(false);
  };

  const currentThemeInfo = getCurrentTheme();

  return (
    <div className={`relative z-50 ${className || ''}`} ref={themeSwitcherRef}>
      <GlassButton
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[120px] px-3 py-2 text-sm font-medium whitespace-nowrap"
        title="切换主题"
      >
        <span className="text-lg">🎨</span>
        <span className="flex-1 text-left">{currentThemeInfo.displayName}</span>
        <span 
          className={`text-xs opacity-70 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </GlassButton>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50 animate-in slide-in-from-top-2 duration-300">
          <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white/95">选择主题</h3>
              <GlassButton
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 p-0 flex items-center justify-center rounded-full text-sm"
              >
                ✕
              </GlassButton>
            </div>

            {/* Theme List */}
            <div className="p-3 space-y-2">
              {availableThemes.map((theme) => (
                <div
                  key={theme.name}
                  className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                    currentTheme === theme.name
                      ? 'bg-white/20 border-white/30'
                      : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/20'
                  }`}
                  onClick={() => handleThemeSelect(theme.name)}
                >
                  {/* Theme Preview */}
                  <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/20 flex-shrink-0">
                    <div
                      className="w-full h-full relative"
                      style={{ background: theme.preview }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10"></div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-white/95 mb-1">
                      {theme.displayName}
                    </h4>
                    <p className="text-sm text-white/70 leading-tight">
                      {theme.description}
                    </p>
                  </div>

                  {/* Active Indicator */}
                  {currentTheme === theme.name && (
                    <div className="text-green-300 text-xl font-bold flex-shrink-0 animate-in scale-in-75 duration-200">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <p className="text-xs text-white/60 text-center italic">
                💡 主题会自动保存到本地存储
              </p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcherTailwind;