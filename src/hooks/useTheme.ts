import { useState, useEffect, useCallback, useMemo } from 'react';

export type ThemeName = 'glass-future' | 'dark-tech' | 'warm-business' | 'minimal-monochrome';

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
    preview: 'linear-gradient(135deg, oklch(0.585 0.233 277.117) 0%, oklch(0.511 0.262 276.966) 100%)'
  },
  {
    name: 'dark-tech',
    displayName: '深色科技风',
    description: '深色背景，科技感界面',
    preview: 'linear-gradient(135deg, oklch(0.208 0.042 265.755) 0%, oklch(0.279 0.041 260.031) 100%)'
  },
  {
    name: 'warm-business',
    displayName: '温暖商务风',
    description: '温暖色调，商务专业风格',
    preview: 'linear-gradient(135deg, oklch(0.828 0.189 84.429) 0%, oklch(0.769 0.188 70.08) 100%)'
  },
  {
    name: 'minimal-monochrome',
    displayName: '黑白精简风',
    description: '黑白灰极简设计，蓝色点缀',
    preview: 'linear-gradient(135deg, oklch(0.98 0.005 247.858) 0%, oklch(0.929 0.013 255.508) 100%)'
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

  // 防抖函数
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // 主题配置缓存
  const themeConfigs = useMemo(() => ({
    'glass-future': {
      background: 'linear-gradient(135deg, oklch(0.585 0.233 277.117) 0%, oklch(0.511 0.262 276.966) 100%)',
      color: 'white'
    },
    'dark-tech': {
      background: 'linear-gradient(135deg, oklch(0.208 0.042 265.755) 0%, oklch(0.279 0.041 260.031) 100%)',
      color: 'white'
    },
    'warm-business': {
      background: 'linear-gradient(135deg, oklch(0.828 0.189 84.429) 0%, oklch(0.769 0.188 70.08) 100%)',
      color: 'oklch(0.414 0.112 45.904)'
    },
    'minimal-monochrome': {
      background: 'linear-gradient(135deg, oklch(0.98 0.005 247.858) 0%, oklch(0.929 0.013 255.508) 100%)',
      color: 'oklch(0.208 0.042 265.755)'
    }
  }), []);

  // 优化的主题应用函数
  const applyTheme = useCallback((theme: ThemeName) => {
    // 使用 requestAnimationFrame 进行批量DOM更新
    requestAnimationFrame(() => {
      const config = themeConfigs[theme];
      if (!config) return;

      // 批量更新DOM属性
      document.documentElement.setAttribute('data-theme', theme);
      
      // 使用CSS变量而不是直接操作style
      document.documentElement.style.setProperty('--theme-background', config.background);
      document.documentElement.style.setProperty('--theme-color', config.color);
      
      document.body.className = `theme-${theme}`;
      document.body.style.background = config.background;
      document.body.style.color = config.color;
      document.body.style.minHeight = '100vh';
    });
  }, [themeConfigs]);

  // 防抖的主题应用函数
  const debouncedApplyTheme = useMemo(
    () => debounce(applyTheme, 100),
    [debounce, applyTheme]
  );

  // 切换主题
  const switchTheme = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    debouncedApplyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [debouncedApplyTheme]);

  // 获取当前主题信息
  const getCurrentTheme = useCallback(() => {
    return AVAILABLE_THEMES.find(t => t.name === currentTheme) || AVAILABLE_THEMES[0];
  }, [currentTheme]);

  // 切换到下一个主题
  const nextTheme = useCallback(() => {
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === currentTheme);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    switchTheme(AVAILABLE_THEMES[nextIndex].name);
  }, [currentTheme, switchTheme]);

  return {
    currentTheme,
    switchTheme,
    nextTheme,
    getCurrentTheme,
    availableThemes: AVAILABLE_THEMES
  };
};

export default useTheme;