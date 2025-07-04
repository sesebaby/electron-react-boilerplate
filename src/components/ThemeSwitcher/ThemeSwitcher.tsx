import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import './ThemeSwitcher.css';

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
    <div className={`theme-switcher ${className || ''}`} ref={themeSwitcherRef}>
      <button
        type="button"
        className="theme-toggle-button glass-button"
        onClick={() => setIsOpen(!isOpen)}
        title="切换主题"
      >
        <span className="theme-icon">🎨</span>
        <span className="theme-name">{currentThemeInfo.displayName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown popup-dropdown">
            <div className="theme-dropdown-header popup-header">
              <h3>选择主题</h3>
              <button
                type="button"
                className="close-button glass-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="theme-list popup-content">
              {availableThemes.map((theme) => (
                <div
                  key={theme.name}
                  className={`theme-option ${currentTheme === theme.name ? 'active' : ''}`}
                  onClick={() => handleThemeSelect(theme.name)}
                >
                  <div className="theme-preview">
                    <div
                      className="preview-gradient"
                      style={{ background: theme.preview }}
                    ></div>
                  </div>
                  <div className="theme-info">
                    <h4 className="theme-title">{theme.displayName}</h4>
                    <p className="theme-description">{theme.description}</p>
                  </div>
                  {currentTheme === theme.name && (
                    <div className="active-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>

            <div className="theme-footer">
              <p className="theme-tip">💡 主题会自动保存到本地存储</p>
            </div>
          </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;