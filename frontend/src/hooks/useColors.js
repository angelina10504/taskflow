import { useTheme } from 'next-themes';

const useColors = () => {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  return {
    dark,
    cardBg:        dark ? '#1e2535' : 'white',
    pageBg:        dark ? '#0f1624' : 'gray.50',
    panelBg:       dark ? '#1a2030' : 'white',
    inputBg:       dark ? '#1a2030' : 'white',
    hoverBg:       dark ? '#252c3d' : 'gray.50',
    border:        dark ? '#2a3244' : 'gray.200',
    borderLight:   dark ? '#2a3244' : 'gray.100',
    textPrimary:   dark ? 'gray.100' : 'gray.800',
    textSecondary: dark ? 'gray.400' : 'gray.500',
    textMuted:     dark ? 'gray.500' : 'gray.400',
  };
};

export default useColors;
