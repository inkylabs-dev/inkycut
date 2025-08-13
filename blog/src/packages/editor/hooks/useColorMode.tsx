import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { themeAtom, type ThemeMode } from '../atoms';

export default function useColorMode() {
  const [colorMode, setColorMode] = useAtom(themeAtom);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;
    const htmlClass = window.document.documentElement.classList;

    // Function to get system preference
    const getSystemTheme = (): 'light' | 'dark' => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Determine effective theme
    let theme: 'light' | 'dark';
    if (colorMode === 'system') {
      theme = getSystemTheme();
    } else {
      theme = colorMode;
    }

    setEffectiveTheme(theme);

    // Apply theme to both body and html elements
    if (theme === 'dark') {
      bodyClass.add(className);
      htmlClass.add(className);
    } else {
      bodyClass.remove(className);
      htmlClass.remove(className);
    }

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (colorMode === 'system') {
        const newTheme = getSystemTheme();
        setEffectiveTheme(newTheme);
        if (newTheme === 'dark') {
          bodyClass.add(className);
          htmlClass.add(className);
        } else {
          bodyClass.remove(className);
          htmlClass.remove(className);
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [colorMode]);

  return [colorMode, setColorMode, effectiveTheme] as const;
};