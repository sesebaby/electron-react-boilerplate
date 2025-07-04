/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 启用基于 class 的主题模式
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // 原有的基础颜色保持
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 主题特定颜色
        'glass-future': {
          bg: 'oklch(0.585 0.233 277.117)',
          'bg-secondary': 'oklch(0.511 0.262 276.966)',
          surface: 'oklch(0.93 0.034 272.788 / 0.12)',
          popup: 'oklch(0.511 0.262 276.966 / 0.9)',
          text: 'oklch(100% 0.00011 271.152 / 0.945)',
          'text-secondary': 'oklch(92.369% 0.00263 230.33)',
        },
        'dark-tech': {
          bg: 'oklch(0.208 0.042 265.755)',
          'bg-secondary': 'oklch(0.279 0.041 260.031)',
          surface: 'oklch(0.279 0.041 260.031 / 0.05)',
          popup: 'oklch(0.279 0.041 260.031 / 0.85)',
          text: 'oklch(0.968 0.007 247.896)',
          'text-secondary': 'oklch(0.929 0.013 255.508)',
        },
        'warm-business': {
          bg: 'oklch(0.828 0.189 84.429)',
          'bg-secondary': 'oklch(0.769 0.188 70.08)',
          surface: 'oklch(0.987 0.022 95.277 / 0.6)',
          popup: 'oklch(0.987 0.022 95.277 / 0.85)',
          text: 'oklch(0.414 0.112 45.904)',
          'text-secondary': 'oklch(0.473 0.137 46.201)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.45)',
      }
    },
  },
  plugins: [
    function({ addUtilities, addComponents }) {
      // 基础玻璃态效果
      const glassUtilities = {
        '.glass-card': {
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          borderRadius: '16px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.glass-surface': {
          backdropFilter: 'blur(15px)',
          '-webkit-backdrop-filter': 'blur(15px)',
          borderRadius: '12px',
        },
        '.glass-input': {
          backdropFilter: 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          borderRadius: '8px',
          transition: 'all 0.3s ease',
        },
        '.glass-button': {
          backdropFilter: 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          borderRadius: '8px',
          transition: 'all 0.3s ease',
        },
      }
      
      // 主题特定的组件样式
      const themeComponents = {
        // 玻璃未来风主题
        '[data-theme="glass-future"] .glass-card': {
          background: 'oklch(0.93 0.034 272.788 / 0.08)',
          border: '1px solid oklch(0.87 0.065 274.039 / 0.3)',
          boxShadow: '0 8px 32px oklch(0.257 0.09 281.288 / 0.15)',
        },
        '[data-theme="glass-future"] .glass-surface': {
          background: 'oklch(0.93 0.034 272.788 / 0.12)',
          border: '1px solid oklch(0.87 0.065 274.039 / 0.4)',
        },
        '[data-theme="glass-future"] .glass-input, [data-theme="glass-future"] .glass-select': {
          background: 'oklch(0.585 0.233 277.117 / 0.85)',
          border: '1px solid oklch(0.87 0.065 274.039 / 0.6)',
          color: 'oklch(100% 0.00011 271.152 / 0.945)',
        },
        '[data-theme="glass-future"] .glass-input:focus, [data-theme="glass-future"] .glass-select:focus': {
          outline: 'none',
          background: 'oklch(0.457 0.24 277.023 / 0.95)',
          borderColor: 'oklch(0.968 0.007 247.896)',
          boxShadow: '0 0 0 3px oklch(0.968 0.007 247.896)',
        },
        '[data-theme="glass-future"] .glass-input::placeholder': {
          color: 'oklch(0.968 0.007 247.896)',
          opacity: '0.8',
        },
        '[data-theme="glass-future"] .glass-button': {
          background: 'oklch(0.585 0.233 277.117 / 0.85)',
          border: '1px solid oklch(0.87 0.065 274.039 / 0.6)',
          color: 'oklch(100% 0.00011 271.152 / 0.945)',
        },
        '[data-theme="glass-future"] .glass-button:hover': {
          background: 'oklch(0.457 0.24 277.023 / 0.95)',
          borderColor: 'oklch(92.369% 0.00263 230.33)',
          transform: 'translateY(-1px)',
        },
        '[data-theme="glass-future"] .glass-select': {
          appearance: 'none',
          paddingRight: '2.5rem',
          backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23ffffff\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        },

        // 深色科技风主题
        '[data-theme="dark-tech"] .glass-card': {
          background: 'oklch(0.279 0.041 260.031 / 0.03)',
          border: '1px solid oklch(0.446 0.043 257.281 / 0.3)',
          boxShadow: '0 8px 32px oklch(0.129 0.042 264.695 / 0.3)',
        },
        '[data-theme="dark-tech"] .glass-surface': {
          background: 'oklch(0.279 0.041 260.031 / 0.05)',
          border: '1px solid oklch(0.446 0.043 257.281 / 0.3)',
        },
        '[data-theme="dark-tech"] .glass-input, [data-theme="dark-tech"] .glass-select': {
          background: 'oklch(0.279 0.041 260.031 / 0.85)',
          border: '1px solid oklch(0.446 0.043 257.281 / 0.3)',
          color: 'oklch(0.968 0.007 247.896)',
        },
        '[data-theme="dark-tech"] .glass-input:focus, [data-theme="dark-tech"] .glass-select:focus': {
          outline: 'none',
          background: 'oklch(0.372 0.044 257.287 / 0.9)',
          borderColor: 'oklch(0.929 0.013 255.508)',
          boxShadow: '0 0 0 3px oklch(0.929 0.013 255.508)',
        },
        '[data-theme="dark-tech"] .glass-input::placeholder': {
          color: 'oklch(0.869 0.022 252.894)',
          opacity: '0.8',
        },
        '[data-theme="dark-tech"] .glass-button': {
          background: 'oklch(0.279 0.041 260.031 / 0.85)',
          border: '1px solid oklch(0.446 0.043 257.281 / 0.3)',
          color: 'oklch(0.968 0.007 247.896)',
        },
        '[data-theme="dark-tech"] .glass-button:hover': {
          background: 'oklch(0.372 0.044 257.287 / 0.9)',
          borderColor: 'oklch(0.929 0.013 255.508)',
          transform: 'translateY(-1px)',
        },
        '[data-theme="dark-tech"] .glass-select': {
          appearance: 'none',
          paddingRight: '2.5rem',
          backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23f1f5f9\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        },

        // 温暖商务风主题
        '[data-theme="warm-business"] .glass-card': {
          background: 'oklch(0.987 0.022 95.277 / 0.4)',
          border: '1px solid oklch(0.924 0.12 95.746 / 0.4)',
          boxShadow: '0 8px 32px oklch(0.279 0.077 45.635 / 0.2)',
        },
        '[data-theme="warm-business"] .glass-surface': {
          background: 'oklch(0.987 0.022 95.277 / 0.6)',
          border: '1px solid oklch(0.924 0.12 95.746 / 0.4)',
        },
        '[data-theme="warm-business"] .glass-input, [data-theme="warm-business"] .glass-select': {
          background: 'oklch(0.987 0.022 95.277 / 0.85)',
          border: '1px solid oklch(0.924 0.12 95.746 / 0.4)',
          color: 'oklch(0.414 0.112 45.904)',
        },
        '[data-theme="warm-business"] .glass-input:focus, [data-theme="warm-business"] .glass-select:focus': {
          outline: 'none',
          background: 'oklch(0.987 0.022 95.277 / 0.95)',
          borderColor: 'oklch(0.473 0.137 46.201)',
          boxShadow: '0 0 0 3px oklch(0.473 0.137 46.201)',
        },
        '[data-theme="warm-business"] .glass-input::placeholder': {
          color: 'oklch(0.555 0.163 48.998)',
          opacity: '0.8',
        },
        '[data-theme="warm-business"] .glass-button': {
          background: 'oklch(0.987 0.022 95.277 / 0.85)',
          border: '1px solid oklch(0.924 0.12 95.746 / 0.4)',
          color: 'oklch(0.414 0.112 45.904)',
        },
        '[data-theme="warm-business"] .glass-button:hover': {
          background: 'oklch(0.987 0.022 95.277 / 0.95)',
          borderColor: 'oklch(0.473 0.137 46.201)',
          transform: 'translateY(-1px)',
        },
        '[data-theme="warm-business"] .glass-select': {
          appearance: 'none',
          paddingRight: '2.5rem',
          backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23451a03\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        },
      }

      addUtilities(glassUtilities)
      addComponents(themeComponents)
    }
  ],
}