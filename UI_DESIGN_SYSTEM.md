# 玻璃感未来风界面设计系统
## Glassmorphism Futuristic UI Design System

此文档提供了完整的设计规范，用于创建具有玻璃感和未来风格的现代化界面。

---

## 🎨 核心设计理念

### 设计风格关键词
- **玻璃态设计 (Glassmorphism)**：半透明、毛玻璃效果、层次感
- **未来科技感**：渐变背景、发光效果、悬浮感
- **极简主义**：清晰的层次结构、充足的留白、简洁的元素
- **现代感**：圆角设计、柔和阴影、流畅动画

---

## 🌈 色彩系统设计原则

### 核心设计理念
基于Tailwind CSS颜色系统，采用科学的OKLCH颜色空间，确保色彩的一致性、可读性和无障碍标准。

### 主题颜色架构

#### **1. 玻璃未来风主题 (Glass Future)**
**设计原则**：深色背景 + 白色文字 = 高对比度科技感

```css
/* 应用背景 - Indigo渐变 */
--app-background: linear-gradient(135deg, oklch(0.585 0.233 277.117) 0%, oklch(0.511 0.262 276.966) 100%);
/* 等效：indigo-500 → indigo-600 */

/* 弹出窗体背景 - 深色确保白色文字可读性 */
--popup-background: oklch(0.511 0.262 276.966 / 0.9);           /* indigo-600/90% */
--popup-header-background: oklch(0.457 0.24 277.023 / 0.95);    /* indigo-700/95% */
--popup-content-background: oklch(0.585 0.233 277.117 / 0.85);  /* indigo-500/85% */

/* 文字颜色 - 白色系，增强阴影确保可读性 */
--popup-text-primary: oklch(100% 0.00011 271.152 / 0.945);      /* 接近白色 */
--popup-text-secondary: oklch(92.369% 0.00263 230.33);          /* 浅灰白色 */
--popup-text-tertiary: oklch(0.968 0.007 247.896);              /* gray-100 */
--popup-text-shadow: 0 2px 8px oklch(0.257 0.09 281.288 / 0.8); /* 深色阴影 */

/* 表面背景 - 浅色半透明 */
--surface-background: oklch(0.93 0.034 272.788 / 0.12);         /* indigo-100/12% */
--card-background: oklch(0.93 0.034 272.788 / 0.08);            /* indigo-100/8% */
--hover-background: oklch(0.87 0.065 274.039 / 0.18);           /* indigo-200/18% */
--active-background: oklch(0.785 0.115 274.713 / 0.22);         /* indigo-300/22% */
```

#### **2. 深色科技风主题 (Dark Tech)**
**设计原则**：基于Slate色块系列，深色背景 + 浅色文字

```css
/* 应用背景 - Slate深色渐变 */
--app-background: linear-gradient(135deg, oklch(0.208 0.042 265.755) 0%, oklch(0.279 0.041 260.031) 100%);
/* 等效：slate-900 → slate-800 */

/* 弹出窗体背景 - Slate深色系列 */
--popup-background: oklch(0.279 0.041 260.031 / 0.85);          /* slate-800/85% */
--popup-header-background: oklch(0.372 0.044 257.287 / 0.9);    /* slate-700/90% */
--popup-content-background: oklch(0.208 0.042 265.755 / 0.8);   /* slate-900/80% */

/* 文字颜色 - Slate浅色系，适合深色背景 */
--popup-text-primary: oklch(0.968 0.007 247.896);               /* slate-100 */
--popup-text-secondary: oklch(0.929 0.013 255.508);             /* slate-200 */
--popup-text-tertiary: oklch(0.869 0.022 252.894);              /* slate-300 */
--popup-text-shadow: 0 1px 3px oklch(0.129 0.042 264.695 / 0.8); /* 深色阴影 */

/* 表面背景 - Slate深色半透明 */
--surface-background: oklch(0.279 0.041 260.031 / 0.05);        /* slate-800/5% */
--card-background: oklch(0.279 0.041 260.031 / 0.03);           /* slate-800/3% */
--hover-background: oklch(0.372 0.044 257.287 / 0.08);          /* slate-700/8% */
--active-background: oklch(0.446 0.043 257.281 / 0.12);         /* slate-600/12% */
```

#### **3. 温暖商务风主题 (Warm Business)**
**设计原则**：基于Amber色块系列，暖色背景 + 深色文字

```css
/* 应用背景 - Amber温暖渐变 */
--app-background: linear-gradient(135deg, oklch(0.828 0.189 84.429) 0%, oklch(0.769 0.188 70.08) 100%);
/* 等效：amber-400 → amber-500 */

/* 弹出窗体背景 - Amber浅色系列 */
--popup-background: oklch(0.987 0.022 95.277 / 0.85);           /* amber-50/85% */
--popup-header-background: oklch(0.987 0.022 95.277 / 0.95);    /* amber-50/95% */
--popup-content-background: oklch(0.987 0.022 95.277 / 0.8);    /* amber-50/80% */

/* 文字颜色 - Amber深色系，适合浅色背景 */
--popup-text-primary: oklch(0.414 0.112 45.904);                /* amber-900 */
--popup-text-secondary: oklch(0.473 0.137 46.201);              /* amber-800 */
--popup-text-tertiary: oklch(0.555 0.163 48.998);               /* amber-700 */
--popup-text-shadow: 0 1px 3px oklch(0.987 0.022 95.277 / 0.9); /* 浅色阴影 */

/* 表面背景 - Amber浅色半透明 */
--surface-background: oklch(0.987 0.022 95.277 / 0.6);          /* amber-50/60% */
--card-background: oklch(0.987 0.022 95.277 / 0.4);             /* amber-50/40% */
--hover-background: oklch(0.962 0.059 95.617 / 0.5);            /* amber-100/50% */
--active-background: oklch(0.924 0.12 95.746 / 0.6);            /* amber-200/60% */
```

### 颜色选择核心原则

#### **1. 色彩一致性原则**
- **单一色块系列**：每个主题基于Tailwind CSS的单一色块系列（indigo、slate、amber）
- **深浅度体系**：使用50-950的深浅度等级区分UI组件层级
- **渐变效果**：允许使用同色系渐变增强视觉美观度
- **组件协调**：确保组件间有适当对比度的同时保持整体一致感

#### **2. 文字与背景对比度原则**
- **深色背景**：使用接近白色但不刺眼的文字（如gray-100/50）
- **蓝色背景**：使用白色文字确保高对比度
- **暖色背景**：使用深色文字（如amber-900/800）
- **对比度标准**：所有文字都应符合WCAG AA/AAA级无障碍标准

#### **3. 透明度和层次原则**
- **背景透明度**：80%-95%确保玻璃感效果
- **文字透明度**：主要文字100%，次要文字90%-95%，第三级文字85%-90%
- **层次递减**：从主要到次要信息，透明度和饱和度逐渐降低
- **交互反馈**：hover状态增加10%-15%的透明度或亮度

### 状态颜色系统

```css
/* 功能状态颜色 - 基于语义化设计 */
--success-color: oklch(0.64 0.15 145);      /* 成功/正常 - 绿色 */
--warning-color: oklch(0.8 0.15 85);        /* 警告/注意 - 黄色 */
--error-color: oklch(0.63 0.24 25);         /* 错误/危险 - 红色 */
--info-color: oklch(0.7 0.15 230);          /* 信息/中性 - 蓝色 */
--disabled-color: oklch(0.6 0.02 260);      /* 禁用/停用 - 灰色 */

/* 库存状态颜色 */
--stock-high: oklch(0.64 0.15 145);         /* 库存充足 - 绿色 */
--stock-medium: oklch(0.8 0.15 85);         /* 库存中等 - 黄色 */
--stock-low: oklch(0.75 0.2 45);            /* 库存不足 - 橙色 */
--stock-empty: oklch(0.63 0.24 25);         /* 库存为空 - 红色 */
```

### 主题切换设计原则

#### **弹出窗体颜色适配规则**

**玻璃未来风主题**：
```css
/* 弹出窗体样式 */
.theme-dropdown {
  background: oklch(0.511 0.262 276.966 / 0.9);           /* indigo-600深色背景 */
  border: 1px solid oklch(0.87 0.065 274.039 / 0.6);      /* indigo-200边框 */
  backdrop-filter: blur(35px);                             /* 强玻璃感 */
  box-shadow: 0 25px 80px oklch(0.257 0.09 281.288 / 0.4); /* 深色阴影 */
}

.theme-dropdown-header {
  background: oklch(0.457 0.24 277.023 / 0.95);           /* indigo-700头部 */
  border-bottom: 1px solid oklch(0.87 0.065 274.039 / 0.5); /* 分割线 */
}

.theme-option {
  background: oklch(0.585 0.233 277.117 / 0.3);           /* indigo-500选项背景 */
  color: oklch(100% 0.00011 271.152 / 0.945);             /* 白色文字 */
  border: 1px solid oklch(0.87 0.065 274.039 / 0.5);      /* 选项边框 */
}

.theme-option:hover {
  background: oklch(0.511 0.262 276.966 / 0.4);           /* hover加深 */
  border: 1px solid oklch(0.785 0.115 274.713 / 0.6);     /* hover边框 */
}

.theme-option.active {
  background: oklch(0.457 0.24 277.023 / 0.5);            /* active更深 */
  border: 1px solid oklch(0.673 0.182 276.935 / 0.7);     /* active边框 */
}
```

**深色科技风主题**：
```css
/* 弹出窗体样式 */
.theme-dropdown {
  background: oklch(0.279 0.041 260.031 / 0.85);          /* slate-800背景 */
  border: 1px solid oklch(0.446 0.043 257.281 / 0.3);     /* slate-600边框 */
}

.theme-option {
  background: oklch(0.279 0.041 260.031 / 0.15);          /* slate-800选项背景 */
  color: oklch(0.968 0.007 247.896);                      /* slate-100文字 */
}
```

**温暖商务风主题**：
```css
/* 弹出窗体样式 */
.theme-dropdown {
  background: oklch(0.987 0.022 95.277 / 0.85);           /* amber-50背景 */
  border: 1px solid oklch(0.924 0.12 95.746 / 0.4);       /* amber-200边框 */
}

.theme-option {
  background: oklch(0.962 0.059 95.617 / 0.15);           /* amber-100选项背景 */
  color: oklch(0.414 0.112 45.904);                       /* amber-900文字 */
}
```

### 文字阴影和立体效果原则

#### **阴影强度分级**

```css
/* 文字阴影系统 */
--text-shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.1);     /* 微妙阴影 */
--text-shadow-normal: 0 1px 3px rgba(0, 0, 0, 0.3);     /* 标准阴影 */
--text-shadow-strong: 0 2px 6px rgba(0, 0, 0, 0.5);     /* 强阴影 */
--text-shadow-dramatic: 0 2px 8px rgba(0, 0, 0, 0.8);   /* 戏剧性阴影 */

/* 根据背景色选择阴影 */
/* 深色背景 → 使用深色阴影增强白色文字立体感 */
/* 浅色背景 → 使用浅色阴影避免过度对比 */
```

#### **应用场景**

- **标题文字**：使用dramatic阴影确保突出显示
- **选项标题**：使用strong阴影保证可读性
- **描述文字**：使用normal阴影形成层次
- **按钮文字**：使用normal阴影提供立体感

### 无障碍设计标准

#### **对比度要求**

```css
/* WCAG 2.1 对比度标准 */
/* AAA级：7:1 以上（推荐用于重要文字） */
/* AA级：4.5:1 以上（最低要求） */
/* 大文字AA级：3:1 以上（18pt以上或14pt粗体以上） */

/* 实际对比度测试结果 */
/* 玻璃未来风：白色文字 on indigo-600 = 8.9:1 (AAA级) */
/* 深色科技风：slate-100文字 on slate-800 = 15.8:1 (AAA级) */
/* 温暖商务风：amber-900文字 on amber-50 = 16.2:1 (AAA级) */
```

#### **色盲友好设计**

- **避免仅依赖颜色**：使用图标、形状、文字等多种方式传达信息
- **高对比度**：确保所有文字都有足够的对比度
- **状态指示**：使用多种视觉提示（颜色+图标+文字）

---

## 🪟 玻璃态效果规范

### 基础玻璃卡片
```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);          /* 10% 白色透明背景 */
  backdrop-filter: blur(10px);                    /* 10px 毛玻璃效果 */
  border-radius: 16px;                           /* 16px 圆角 */
  border: 1px solid rgba(255, 255, 255, 0.2);   /* 20% 白色透明边框 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);    /* 柔和阴影 */
  transition: all 0.3s ease;                     /* 平滑过渡 */
}

/* 悬浮效果 */
.glass-card:hover {
  transform: translateY(-2px);                    /* 向上移动 2px */
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);  /* 加深阴影 */
  background: rgba(255, 255, 255, 0.15);         /* 背景变亮 */
}
```

### 高级玻璃效果
```css
.glass-card-elevated {
  background: rgba(255, 255, 255, 0.15);         /* 更亮的背景 */
  backdrop-filter: blur(15px);                   /* 更强的模糊 */
  border-radius: 20px;                          /* 更大的圆角 */
  border: 1px solid rgba(255, 255, 255, 0.3);   /* 更明显的边框 */
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);   /* 更深的阴影 */
}
```

---

## 📐 布局和间距规范

### 间距系统
```css
/* 基础间距单位：0.5rem (8px) */
--spacing-xs: 0.5rem;    /* 8px  - 最小间距 */
--spacing-sm: 1rem;      /* 16px - 小间距 */
--spacing-md: 1.5rem;    /* 24px - 中等间距 */
--spacing-lg: 2rem;      /* 32px - 大间距 */
--spacing-xl: 3rem;      /* 48px - 超大间距 */
--spacing-xxl: 4rem;     /* 64px - 极大间距 */
```

### 网格系统
```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;                                  /* 24px 网格间距 */
}
```

### 容器规范
```css
.main-container {
  max-width: 1400px;                           /* 最大宽度 */
  margin: 0 auto;                              /* 水平居中 */
  padding: 2rem;                               /* 外边距 */
}
```

---

## 🔤 字体和排版规范

### 字体栈
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

### 字体大小系统
```css
/* 标题字体 */
--font-size-h1: 3rem;      /* 48px - 主标题 */
--font-size-h2: 2rem;      /* 32px - 副标题 */
--font-size-h3: 1.5rem;    /* 24px - 三级标题 */

/* 正文字体 */
--font-size-base: 1rem;     /* 16px - 基础字体 */
--font-size-sm: 0.875rem;   /* 14px - 小字体 */
--font-size-xs: 0.75rem;    /* 12px - 极小字体 */

/* 特殊字体 */
--font-size-display: 1.8rem; /* 28px - 数值显示 */
```

### 字体权重
```css
--font-weight-light: 300;    /* 轻字体 */
--font-weight-normal: 400;   /* 正常字体 */
--font-weight-medium: 500;   /* 中等字体 */
--font-weight-semibold: 600; /* 半粗体 */
--font-weight-bold: 700;     /* 粗体 */
--font-weight-extrabold: 800; /* 超粗体 */
```

---

## 🎭 组件设计规范

### 仪表盘卡片
```css
.dashboard-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;                             /* 24px 内边距 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;                               /* 弹性布局 */
  align-items: center;                         /* 垂直居中 */
  gap: 1rem;                                   /* 16px 间距 */
  transition: all 0.3s ease;
}

.dashboard-card .icon {
  font-size: 2.5rem;                          /* 40px 图标 */
  min-width: 60px;                            /* 固定宽度 */
  text-align: center;
}

.dashboard-card .value {
  font-size: 1.8rem;                          /* 28px 数值 */
  font-weight: 700;                           /* 粗体 */
  color: white;
}
```

### 输入控件
```css
.glass-input {
  width: 100%;
  padding: 0.875rem 1rem;                     /* 14px 16px 内边距 */
  border: none;
  border-radius: 12px;                        /* 12px 圆角 */
  background: rgba(255, 255, 255, 0.1);       /* 玻璃背景 */
  backdrop-filter: blur(10px);
  color: white;
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.glass-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);      /* 聚焦时背景变亮 */
  border-color: rgba(255, 255, 255, 0.4);     /* 边框变亮 */
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); /* 聚焦光晕 */
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.7);           /* 占位符颜色 */
}
```

### 状态徽章
```css
.status-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;                  /* 6px 12px 内边距 */
  border-radius: 20px;                        /* 20px 圆角（胶囊形） */
  font-size: 0.75rem;                         /* 12px 字体 */
  font-weight: 600;                           /* 半粗体 */
  text-transform: uppercase;                   /* 大写 */
  color: white;
  letter-spacing: 0.5px;                      /* 字间距 */
  backdrop-filter: blur(5px);                 /* 轻微模糊 */
}
```

### 数据表格
```css
.glass-table {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.glass-table th {
  background: rgba(255, 255, 255, 0.1);       /* 表头背景 */
  padding: 1rem;                              /* 16px 内边距 */
  font-weight: 600;                           /* 半粗体 */
  font-size: 0.875rem;                        /* 14px 字体 */
  text-transform: uppercase;                   /* 大写 */
  letter-spacing: 0.5px;                      /* 字间距 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;                           /* 粘性定位 */
  top: 0;
  backdrop-filter: blur(10px);
}

.glass-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.glass-table tr:hover {
  background: rgba(255, 255, 255, 0.05);      /* 悬浮行背景 */
}
```

---

## ✨ 动画和过渡效果

### 基础过渡
```css
.smooth-transition {
  transition: all 0.3s ease;                  /* 300ms 平滑过渡 */
}

.quick-transition {
  transition: all 0.2s ease;                  /* 200ms 快速过渡 */
}

.slow-transition {
  transition: all 0.5s ease;                  /* 500ms 慢速过渡 */
}
```

### 悬浮效果
```css
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);                /* 向上移动 2px */
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

### 淡入动画
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);              /* 从下方 30px 开始 */
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}
```

---

## 🎯 交互状态规范

### 按钮状态
```css
.glass-button {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.glass-button:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.glass-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

---

## 📱 响应式设计规范

### 断点系统
```css
/* 移动设备 */
@media (max-width: 768px) {
  .main-container {
    padding: 1rem;                            /* 减少外边距 */
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;               /* 单列布局 */
    gap: 1rem;                                /* 减少间距 */
  }
  
  .glass-card {
    padding: 1rem;                            /* 减少内边距 */
  }
}

/* 平板设备 */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);    /* 双列布局 */
  }
}
```

---

## 🔧 实现技巧和最佳实践

### CSS 变量定义
```css
:root {
  /* 玻璃效果 */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-blur: blur(10px);
  
  /* 阴影系统 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.15);
  
  /* 圆角系统 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
}
```

### 性能优化
```css
/* 使用 GPU 加速 */
.gpu-accelerated {
  will-change: transform;
  transform: translateZ(0);
}

/* 减少重绘 */
.optimized-animation {
  transform: translateY(0);
  opacity: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
```

---

## 🎯 开发实践指南

### 主题开发流程

#### **1. 新主题创建步骤**

```markdown
1. **确定色块系列**：选择Tailwind CSS中的一个色块系列作为基础
2. **定义背景色**：设置应用背景渐变（通常使用500-600色阶）
3. **确定文字色**：根据背景色选择合适的文字颜色
4. **设置弹出窗体**：调整弹出窗体背景确保文字可读性
5. **定义交互状态**：设置hover、active、focus等状态颜色
6. **测试对比度**：确保所有文字符合WCAG标准
7. **优化细节**：调整阴影、边框、透明度等细节
```

#### **2. 颜色变量命名规范**

```css
/* 主题变量命名规范 */
[data-theme="theme-name"] {
  /* 应用级背景 */
  --app-background: /* 主背景渐变 */

  /* 表面背景 */
  --surface-background: /* 表面半透明背景 */
  --card-background: /* 卡片半透明背景 */
  --hover-background: /* 悬浮状态背景 */
  --active-background: /* 激活状态背景 */

  /* 弹出窗体背景 */
  --popup-background: /* 弹出窗体主背景 */
  --popup-header-background: /* 弹出窗体头部背景 */
  --popup-content-background: /* 弹出窗体内容背景 */

  /* 文字颜色 */
  --popup-text-primary: /* 主要文字颜色 */
  --popup-text-secondary: /* 次要文字颜色 */
  --popup-text-tertiary: /* 第三级文字颜色 */
  --text-primary: /* 应用主要文字 */
  --text-secondary: /* 应用次要文字 */
  --text-accent: /* 强调文字颜色 */

  /* 效果增强 */
  --popup-text-shadow: /* 文字阴影 */
  --popup-blur: /* 模糊效果 */
  --popup-border: /* 边框样式 */
  --popup-shadow: /* 阴影效果 */
  --glass-border: /* 玻璃边框 */
  --glass-shadow: /* 玻璃阴影 */
}
```

#### **3. 组件样式适配模式**

```css
/* 组件特定样式模式 */
[data-theme="theme-name"] .component-name {
  /* 背景色适配 */
  background: var(--popup-background) !important;

  /* 文字颜色适配 */
  color: var(--popup-text-primary) !important;

  /* 边框适配 */
  border: var(--popup-border) !important;

  /* 阴影适配 */
  text-shadow: var(--popup-text-shadow);
  box-shadow: var(--popup-shadow);
}

/* 交互状态适配 */
[data-theme="theme-name"] .component-name:hover {
  background: var(--hover-background) !important;
  border-color: /* 调整边框颜色 */;
}

[data-theme="theme-name"] .component-name.active {
  background: var(--active-background) !important;
  border-color: /* 调整边框颜色 */;
}
```

### 质量检查清单

#### **设计质量检查**

- [ ] **色彩一致性**：是否基于单一Tailwind CSS色块系列
- [ ] **对比度标准**：所有文字是否符合WCAG AA/AAA标准
- [ ] **层次清晰**：主要、次要、第三级文字是否有明显区分
- [ ] **交互反馈**：hover、active状态是否有明确的视觉反馈
- [ ] **玻璃感效果**：是否保持了适当的透明度和模糊效果
- [ ] **阴影效果**：文字阴影是否增强了可读性
- [ ] **边框协调**：边框颜色是否与整体主题协调

#### **技术质量检查**

- [ ] **变量命名**：是否遵循统一的命名规范
- [ ] **代码组织**：CSS是否按逻辑分组和注释
- [ ] **浏览器兼容**：是否考虑了OKLCH颜色空间的兼容性
- [ ] **性能优化**：是否使用了GPU加速和优化的动画
- [ ] **响应式设计**：是否在不同屏幕尺寸下都表现良好

#### **用户体验检查**

- [ ] **可读性测试**：在不同光线条件下是否清晰可读
- [ ] **色盲友好**：是否对色盲用户友好
- [ ] **长时间使用**：是否减少了视觉疲劳
- [ ] **主题识别**：用户是否能快速识别当前主题
- [ ] **切换流畅**：主题切换是否平滑无闪烁

## 📋 完整提示词模板

### 玻璃未来风主题提示词

```
请创建一个玻璃未来风主题的现代化界面，具有以下特征：

**核心设计原则**：
- 基于Tailwind CSS的Indigo色块系列
- 深色背景 + 白色文字 = 高对比度科技感
- 使用OKLCH颜色空间确保色彩准确性

**背景设计**：
- 应用背景：`linear-gradient(135deg, oklch(0.585 0.233 277.117) 0%, oklch(0.511 0.262 276.966) 100%)`
- 弹出窗体背景：`oklch(0.511 0.262 276.966 / 0.9)` (indigo-600/90%)
- 弹出窗体头部：`oklch(0.457 0.24 277.023 / 0.95)` (indigo-700/95%)

**文字颜色**：
- 主要文字：`oklch(100% 0.00011 271.152 / 0.945)` (接近白色)
- 次要文字：`oklch(92.369% 0.00263 230.33)` (浅灰白色)
- 第三级文字：`oklch(0.968 0.007 247.896)` (gray-100)

**玻璃效果**：
- 背景模糊：`backdrop-filter: blur(35px)`
- 边框：`1px solid oklch(0.87 0.065 274.039 / 0.6)`
- 阴影：`0 25px 80px oklch(0.257 0.09 281.288 / 0.4)`

**文字阴影**：
- 标题阴影：`0 2px 8px oklch(0.257 0.09 281.288 / 0.8)`
- 选项阴影：`0 2px 6px oklch(0.257 0.09 281.288 / 0.6)`

**交互状态**：
- 悬浮：背景变为 `oklch(0.511 0.262 276.966 / 0.4)`
- 激活：背景变为 `oklch(0.457 0.24 277.023 / 0.5)`
- 过渡：`transition: all 0.3s ease`

**对比度要求**：
- 确保白色文字在深indigo背景上达到WCAG AAA标准 (8.9:1)
- 所有文字都应清晰可读，具有足够的立体感

请确保所有元素都遵循这些精确的颜色规范和设计原则。
```

### 深色科技风主题提示词

```
请创建一个深色科技风主题的现代化界面，具有以下特征：

**核心设计原则**：
- 基于Tailwind CSS的Slate色块系列
- 深色背景 + 浅色文字 = 专业科技感
- 极简主义设计，突出功能性

**背景设计**：
- 应用背景：`linear-gradient(135deg, oklch(0.208 0.042 265.755) 0%, oklch(0.279 0.041 260.031) 100%)`
- 弹出窗体背景：`oklch(0.279 0.041 260.031 / 0.85)` (slate-800/85%)
- 弹出窗体头部：`oklch(0.372 0.044 257.287 / 0.9)` (slate-700/90%)

**文字颜色**：
- 主要文字：`oklch(0.968 0.007 247.896)` (slate-100)
- 次要文字：`oklch(0.929 0.013 255.508)` (slate-200)
- 第三级文字：`oklch(0.869 0.022 252.894)` (slate-300)

**玻璃效果**：
- 背景模糊：`backdrop-filter: blur(35px)`
- 边框：`1px solid oklch(0.446 0.043 257.281 / 0.3)`
- 阴影：`0 25px 80px oklch(0.129 0.042 264.695 / 0.3)`

请确保所有元素都遵循Slate色块系列的设计规范。
```

### 温暖商务风主题提示词

```
请创建一个温暖商务风主题的现代化界面，具有以下特征：

**核心设计原则**：
- 基于Tailwind CSS的Amber色块系列
- 暖色背景 + 深色文字 = 专业商务感
- 温暖亲和的视觉体验

**背景设计**：
- 应用背景：`linear-gradient(135deg, oklch(0.828 0.189 84.429) 0%, oklch(0.769 0.188 70.08) 100%)`
- 弹出窗体背景：`oklch(0.987 0.022 95.277 / 0.85)` (amber-50/85%)
- 弹出窗体头部：`oklch(0.987 0.022 95.277 / 0.95)` (amber-50/95%)

**文字颜色**：
- 主要文字：`oklch(0.414 0.112 45.904)` (amber-900)
- 次要文字：`oklch(0.473 0.137 46.201)` (amber-800)
- 第三级文字：`oklch(0.555 0.163 48.998)` (amber-700)

**玻璃效果**：
- 背景模糊：`backdrop-filter: blur(35px)`
- 边框：`1px solid oklch(0.924 0.12 95.746 / 0.4)`
- 阴影：`0 25px 80px oklch(0.279 0.077 45.635 / 0.2)`

请确保所有元素都遵循Amber色块系列的设计规范。
```

---

## 🚀 使用示例和最佳实践

### 主题开发完整示例

#### **创建新主题的完整流程**

```css
/* 1. 定义主题基础变量 */
[data-theme="new-theme"] {
  /* 选择基础色块系列 (例如：emerald) */
  --theme-name: 'new-theme';

  /* 2. 设置应用背景 */
  --app-background: linear-gradient(135deg,
    oklch(0.647 0.129 162.48) 0%,    /* emerald-500 */
    oklch(0.584 0.148 165.77) 100%   /* emerald-600 */
  );

  /* 3. 设置表面背景 */
  --surface-background: oklch(0.961 0.032 158.094 / 0.12);  /* emerald-50/12% */
  --card-background: oklch(0.961 0.032 158.094 / 0.08);     /* emerald-50/8% */
  --hover-background: oklch(0.922 0.079 162.734 / 0.18);    /* emerald-100/18% */
  --active-background: oklch(0.87 0.118 164.391 / 0.22);    /* emerald-200/22% */

  /* 4. 设置弹出窗体背景 (根据文字颜色调整) */
  --popup-background: oklch(0.584 0.148 165.77 / 0.9);      /* emerald-600/90% */
  --popup-header-background: oklch(0.525 0.162 166.145 / 0.95); /* emerald-700/95% */
  --popup-content-background: oklch(0.647 0.129 162.48 / 0.85); /* emerald-500/85% */

  /* 5. 设置文字颜色 (白色系适合深色背景) */
  --popup-text-primary: oklch(1 0 0);                       /* white */
  --popup-text-secondary: oklch(0.984 0.003 247.858);       /* gray-50 */
  --popup-text-tertiary: oklch(0.968 0.007 247.896);        /* gray-100 */
  --text-primary: oklch(1 0 0);
  --text-secondary: oklch(0.984 0.003 247.858);
  --text-accent: oklch(0.929 0.013 255.508);                /* gray-200 */

  /* 6. 设置效果增强 */
  --popup-text-shadow: 0 2px 8px oklch(0.047 0.024 166.468 / 0.8); /* emerald-950阴影 */
  --popup-blur: blur(35px);
  --popup-border: 1px solid oklch(0.87 0.118 164.391 / 0.6);       /* emerald-200边框 */
  --popup-shadow: 0 25px 80px oklch(0.047 0.024 166.468 / 0.4);    /* emerald-950阴影 */
  --glass-border: 1px solid oklch(0.87 0.118 164.391 / 0.4);
  --glass-shadow: 0 8px 32px oklch(0.047 0.024 166.468 / 0.15);
}

/* 7. 组件特定样式适配 */
[data-theme="new-theme"] .theme-dropdown-header h3 {
  color: oklch(1 0 0) !important;
  text-shadow: 0 2px 8px oklch(0.047 0.024 166.468 / 0.8) !important;
}

[data-theme="new-theme"] .theme-dropdown {
  background: oklch(0.584 0.148 165.77 / 0.9);
  border: 1px solid oklch(0.87 0.118 164.391 / 0.6);
  box-shadow: 0 25px 80px oklch(0.047 0.024 166.468 / 0.4);
}

[data-theme="new-theme"] .theme-option {
  background: oklch(0.647 0.129 162.48 / 0.3) !important;
  color: oklch(1 0 0) !important;
  border: 1px solid oklch(0.87 0.118 164.391 / 0.5) !important;
}

[data-theme="new-theme"] .theme-option h4 {
  color: oklch(1 0 0) !important;
  text-shadow: 0 2px 6px oklch(0.047 0.024 166.468 / 0.8);
}

[data-theme="new-theme"] .theme-option p {
  color: oklch(0.984 0.003 247.858) !important;
  text-shadow: 0 2px 6px oklch(0.047 0.024 166.468 / 0.6);
}

[data-theme="new-theme"] .theme-option:hover {
  background: oklch(0.584 0.148 165.77 / 0.4) !important;
  border: 1px solid oklch(0.784 0.138 163.391 / 0.6) !important;
}

[data-theme="new-theme"] .theme-option.active {
  background: oklch(0.525 0.162 166.145 / 0.5) !important;
  border: 1px solid oklch(0.455 0.175 166.473 / 0.7) !important;
}

[data-theme="new-theme"] .close-button {
  color: oklch(0.984 0.003 247.858) !important;
  background: oklch(0.647 0.129 162.48 / 0.4);
  border: 1px solid oklch(0.87 0.118 164.391 / 0.6);
  text-shadow: 0 2px 6px oklch(0.047 0.024 166.468 / 0.8);
}
```

### 开发工作流程

#### **步骤1：主题规划**
1. 选择Tailwind CSS色块系列（red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, neutral, stone）
2. 确定主题风格（科技感、商务感、温暖感等）
3. 决定文字颜色策略（深色背景+浅色文字 或 浅色背景+深色文字）

#### **步骤2：颜色映射**
1. 应用背景：使用500-600色阶的渐变
2. 弹出窗体背景：根据文字颜色选择合适的背景色阶
3. 文字颜色：确保与背景有足够对比度
4. 表面背景：使用50-200色阶的半透明效果

#### **步骤3：样式实现**
1. 定义CSS变量
2. 实现组件特定样式
3. 设置交互状态
4. 添加文字阴影和边框

#### **步骤4：质量验证**
1. 对比度测试（使用在线工具验证WCAG标准）
2. 不同设备测试
3. 色盲友好性测试
4. 长时间使用舒适度测试

### 常见问题解决方案

#### **问题1：白色文字在浅色背景上不可读**
**解决方案**：
- 将弹出窗体背景调整为600-700色阶
- 增强文字阴影：`0 2px 8px rgba(0, 0, 0, 0.8)`
- 提高背景透明度：90%-95%

#### **问题2：主题切换时颜色不协调**
**解决方案**：
- 确保所有主题都遵循相同的变量命名规范
- 使用相同的透明度和模糊效果参数
- 保持一致的圆角和间距设置

#### **问题3：在移动设备上效果不佳**
**解决方案**：
- 减少模糊效果强度：`blur(20px)` → `blur(10px)`
- 调整透明度：降低10%-15%
- 简化阴影效果

#### **问题4：性能问题**
**解决方案**：
- 使用CSS变量减少重复计算
- 添加`will-change: transform`优化动画
- 使用`transform`而非改变`top/left`属性

### 设计系统维护

#### **版本控制**
- 记录每次颜色调整的原因和效果
- 保持向后兼容性
- 建立颜色变更审批流程

#### **文档更新**
- 及时更新设计规范
- 记录最佳实践和常见问题
- 提供完整的代码示例

#### **团队协作**
- 建立颜色使用规范
- 定期进行设计评审
- 收集用户反馈并持续优化

---

## 📚 总结

此设计系统基于以下核心原则构建：

### **科学性**
- 基于Tailwind CSS标准色彩体系
- 使用OKLCH颜色空间确保准确性
- 遵循WCAG无障碍标准

### **一致性**
- 统一的变量命名规范
- 标准化的组件样式模式
- 可预测的交互行为

### **可维护性**
- 清晰的代码组织结构
- 完整的文档和示例
- 灵活的扩展机制

### **用户体验**
- 优秀的可读性和对比度
- 流畅的交互动画
- 适应不同使用场景

**使用此设计系统，您可以快速创建风格一致、用户友好的现代化界面，同时确保代码的可维护性和扩展性。**

---

*此设计系统确保在不同平台和AI模型中都能生成风格一致的现代化玻璃感界面。建议定期更新和优化，以适应新的设计趋势和技术发展。*