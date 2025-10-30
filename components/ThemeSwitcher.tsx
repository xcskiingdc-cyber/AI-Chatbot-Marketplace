
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../types';
import { SunIcon, MoonIcon } from './Icons';

const themes: { id: Theme; name: string }[] = [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
    { id: 'synthwave', name: 'Synthwave' },
    { id: 'forest', name: 'Forest' },
];

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <label htmlFor="theme-select" className="block text-sm font-medium text-[--text-secondary] mb-2">
        Theme
      </label>
      <div className="relative">
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="w-full appearance-none bg-[--bg-secondary] border border-[--border-color] text-[--text-primary] py-2 pl-3 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-[--accent-primary]"
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[--text-secondary]">
          {theme === 'light' ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
