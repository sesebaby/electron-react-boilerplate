import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import './ThemeSwitcher.css';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
  const { currentTheme, switchTheme, availableThemes, getCurrentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeSelect = (themeName: string) => {
    switchTheme(themeName as any);
    setIsOpen(false);
  };

  const currentThemeInfo = getCurrentTheme();

  return (
    <div className={`theme-switcher ${className || ''}`}>
      <button
        className="theme-toggle-button glass-button"
        onClick={() => setIsOpen(!isOpen)}
        title="切换主题"
      >
        <span className="theme-icon">🎨</span>
        <span className="theme-name">{currentThemeInfo.displayName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown glass-surface">
          <div className="theme-dropdown-header">
            <h3>选择主题</h3>
            <button 
              className="close-button glass-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="theme-list">
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

      {isOpen && (
        <div 
          className="theme-overlay" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ThemeSwitcher;