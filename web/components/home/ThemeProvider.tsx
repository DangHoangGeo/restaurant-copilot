"use client";
import React, { useState, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContextLanding = React.createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProviderLanding = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Landing page might have its own brand color or use a default
    document.documentElement.style.setProperty('--brand-color-landing', '#019AB1');
  }, [theme]);
  
  return (
    <ThemeContextLanding.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContextLanding.Provider>
  );
};

export const useThemeLanding = () => useContext(ThemeContextLanding);
