
import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useLocalStorage<Theme>('ai-theme', 'dark');

  useEffect(() => {
    const body = window.document.body;
    body.classList.remove('theme-light', 'theme-dark', 'theme-synthwave', 'theme-forest');
    body.classList.add(`theme-${theme}`);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
