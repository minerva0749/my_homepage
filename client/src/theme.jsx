// 主题上下文：浅色 / 深色两套主题。
// 偏好存 localStorage；首次访问跟随系统深浅色设置；无系统偏好时默认深色。
// 注意：初始 data-theme 由 index.html 内联脚本在渲染前设置，避免闪烁；这里只负责状态与切换。
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const v = localStorage.getItem('theme');
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => readStoredTheme() || document.documentElement.getAttribute('data-theme') || 'dark'
  );

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next); // 仅用户手动切换时持久化
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
