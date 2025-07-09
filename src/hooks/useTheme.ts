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
    description: '深灰背景，纯白卡片，黑字indigo装饰',
    preview: 'linear-gradient(135deg, oklch(0.646 0.026 252.894) 0%, oklch(0.583 0.024 252.894) 100%)'
  }
];

const _THEME_STORAGE_KEY = 'inventory-system-theme';

export const _useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('glass-future');

  // 初始化主题
  useEffect(() => {
    const _savedTheme = localStorage.getItem(_THEME_STORAGE_KEY) as ThemeName;
    if (_savedTheme && AVAILABLE_THEMES.find(t => t.name === _savedTheme)) {
      setCurrentTheme(_savedTheme);
    }
    _applyTheme(_savedTheme || 'glass-future');
  }, [_applyTheme]);

  // 防抖函数
  const _debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // 主题配置缓存
  const _themeConfigs = useMemo(() => ({
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
      background: 'linear-gradient(135deg, oklch(0.646 0.026 252.894) 0%, oklch(0.583 0.024 252.894) 100%)',
      color: 'oklch(0.208 0.042 265.755)'
    }
  }), []);

  // 优化的主题应用函数
  const _applyTheme = useCallback((theme: ThemeName) => {
    // 使用 requestAnimationFrame 进行批量DOM更新
    requestAnimationFrame(() => {
      const _config = _themeConfigs[theme];
      if (!_config) return;

      // 批量更新DOM属性
      document.documentElement.setAttribute('data-theme', theme);
      
      // 使用CSS变量而不是直接操作style
      document.documentElement.style.setProperty('--theme-background', _config.background);
      document.documentElement.style.setProperty('--theme-color', _config.color);
      
      document.body.className = `theme-${theme}`;
      document.body.style.background = _config.background;
      document.body.style.color = _config.color;
      document.body.style.minHeight = '100vh';
    });
  }, [_themeConfigs]);

  // 防抖的主题应用函数
  const _debouncedApplyTheme = useMemo(
    () => _debounce(_applyTheme, 100),
    [_debounce, _applyTheme]
  );

  // 切换主题
  const _switchTheme = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    _debouncedApplyTheme(theme);
    localStorage.setItem(_THEME_STORAGE_KEY, theme);
  }, [_debouncedApplyTheme]);

  // 获取当前主题信息
  const _getCurrentTheme = useCallback(() => {
    return AVAILABLE_THEMES.find(t => t.name === currentTheme) || AVAILABLE_THEMES[0];
  }, [currentTheme]);

  // 切换到下一个主题
  const _nextTheme = useCallback(() => {
    const _currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === currentTheme);
    const _nextIndex = (_currentIndex + 1) % AVAILABLE_THEMES.length;
    _switchTheme(AVAILABLE_THEMES[_nextIndex].name);
  }, [currentTheme, _switchTheme]);

  return {
    currentTheme,
    switchTheme: _switchTheme,
    nextTheme: _nextTheme,
    getCurrentTheme: _getCurrentTheme,
    availableThemes: AVAILABLE_THEMES
  };
};

export { _useTheme as useTheme };
export default _useTheme;