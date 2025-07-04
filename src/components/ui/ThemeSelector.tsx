import React, { useState, useEffect } from 'react';
import { GlassCard, GlassSelect } from './FormControls';

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

const themes: Theme[] = [
  {
    id: 'glass-future',
    name: '玻璃未来风',
    description: '深色背景 + 白色文字 = 高对比度科技感',
    colors: {
      primary: 'oklch(0.585 0.233 277.117)',
      secondary: 'oklch(0.511 0.262 276.966)'
    }
  },
  {
    id: 'dark-tech',
    name: '深色科技风',
    description: '基于Slate色块系列，深色背景 + 浅色文字',
    colors: {
      primary: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 260.031)'
    }
  },
  {
    id: 'warm-business',
    name: '温暖商务风',
    description: '基于Amber色块系列，暖色背景 + 深色文字',
    colors: {
      primary: 'oklch(0.828 0.189 84.429)',
      secondary: 'oklch(0.769 0.188 70.08)'
    }
  }
];

export const ThemeSelector: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState('glass-future');

  useEffect(() => {
    // 从localStorage读取保存的主题
    const savedTheme = localStorage.getItem('inventory-system-theme') || 'glass-future';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    // 设置document的data-theme属性
    document.documentElement.setAttribute('data-theme', themeId);
    
    // 设置body背景渐变
    const bodyStyle = document.body.style;
    bodyStyle.background = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`;
    
    // 保存到localStorage
    localStorage.setItem('inventory-system-theme', themeId);
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
  };

  const currentThemeData = themes.find(t => t.id === currentTheme);

  return (
    <GlassCard title="主题设置" className="max-w-md">
      <div className="space-y-4">
        <GlassSelect
          value={currentTheme}
          onChange={(e) => handleThemeChange(e.target.value)}
          label="选择主题"
        >
          {themes.map(theme => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </GlassSelect>

        {currentThemeData && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-white/90 mb-1">
                当前主题：{currentThemeData.name}
              </h4>
              <p className="text-xs text-white/70">
                {currentThemeData.description}
              </p>
            </div>

            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: currentThemeData.colors.primary }}
                title="主色调"
              />
              <div 
                className="w-8 h-8 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: currentThemeData.colors.secondary }}
                title="辅助色调"
              />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};