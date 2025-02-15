// src/hooks/useCSSVariables.ts

import { useEffect, useState } from 'react';

const useCSSVariables = () => {
  const [colors, setColors] = useState<{
    primary: string;
    primaryForeground: string;
    secondary: string;
    background: string;
  }>({
    primary: '',
    primaryForeground: '',
    secondary: '',
    background: '',
  });

  useEffect(() => {
    const getCSSVariable = (variable: string) => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
    };

    const primaryColor = getCSSVariable('--primary');
    const primaryForegroundColor = getCSSVariable('--primary-foreground');
    const secondaryColor = getCSSVariable('--secondary');
    const backgroundColor = getCSSVariable('--background');

    setColors({
      primary: primaryColor,
      primaryForeground: primaryForegroundColor,
      secondary: secondaryColor,
      background: backgroundColor,
    });
  }, []);

  return colors;
};

export default useCSSVariables;  // Ensure this is a default export
