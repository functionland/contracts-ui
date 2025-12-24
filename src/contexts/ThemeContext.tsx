import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const THEME_KEY = 'claim-ui-theme-preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    setIsDarkMode(savedTheme ? savedTheme === 'dark' : false);
    setIsLoaded(true);
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, isLoaded]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Show nothing until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
