import { useState, useEffect } from 'react';

export type ThemeName = 'glass-future' | 'dark-tech' | 'warm-business';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  preview: string;
}

export const AVAILABLE_THEMES: Theme[] = [
  {
    name: 'glass-future',
    displayName: '玻璃未来风',
    description: '透明玻璃感，科技未来风格',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    name: 'dark-tech',
    displayName: '深色科技风',
    description: '深色背景，科技感界面',
    preview: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)'
  },
  {
    name: 'warm-business',
    displayName: '温暖商务风',
    description: '温暖色调，商务专业风格',
    preview: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
  }
];

const THEME_STORAGE_KEY = 'inventory-system-theme';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('glass-future');

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName;
    if (savedTheme && AVAILABLE_THEMES.find(t => t.name === savedTheme)) {
      setCurrentTheme(savedTheme);
    }
    applyTheme(savedTheme || 'glass-future');
  }, []);

  // 应用主题到DOM
  const applyTheme = (theme: ThemeName) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
  };

  // 切换主题
  const switchTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  };

  // 获取当前主题信息
  const getCurrentTheme = () => {
    return AVAILABLE_THEMES.find(t => t.name === currentTheme) || AVAILABLE_THEMES[0];
  };

  // 切换到下一个主题
  const nextTheme = () => {
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === currentTheme);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    switchTheme(AVAILABLE_THEMES[nextIndex].name);
  };

  return {
    currentTheme,
    switchTheme,
    nextTheme,
    getCurrentTheme,
    availableThemes: AVAILABLE_THEMES
  };
};

export default useTheme;