import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, ThemeColors } from './colors';

interface ThemeContextType {
  theme: string;
  colors: ThemeColors;
  setTheme: (theme: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: themes.dark,
  setTheme: () => {},
  isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>('dark');

  const themeColors = themes[currentTheme] || themes.dark;
  const isDark = currentTheme !== 'light';

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        colors: themeColors,
        setTheme: setCurrentTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
