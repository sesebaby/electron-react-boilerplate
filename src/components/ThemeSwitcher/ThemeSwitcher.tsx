import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
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
          ⏷
        </span>
      </GlassButton>

      {/* 主题选择下拉菜单 */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-48 popup-dropdown z-50">
          <div className="p-2 space-y-1">
            {availableThemes.map((theme) => (
              <button
                key={theme.name}
                type="button"
                onClick={() => handleThemeSelect(theme.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all theme-option ${
                  currentTheme === theme.name ? 'active' : ''
                }`}
                style={{
                  color: currentTheme === theme.name 
                    ? 'var(--popup-text-primary)' 
                    : 'var(--popup-text-secondary)',
                  fontWeight: currentTheme === theme.name ? '600' : '400'
                }}
              >
                <span className="w-4 h-4 rounded-full border border-white/30"
                      style={{ background: theme.preview }}></span>
                <span className="flex-1">{theme.displayName}</span>
                {currentTheme === theme.name && (
                  <span className="text-xs opacity-70">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--popup-divider-color)' }}>
            <div className="text-xs px-3 py-1" style={{ color: 'var(--popup-text-tertiary)' }}>
              主题设置已自动保存
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;