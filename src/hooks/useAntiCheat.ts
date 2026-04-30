import { useEffect, useCallback } from 'react';

interface AntiCheatOptions {
  onViolation: (reason: string) => void;
  enabled: boolean;
}

export function useAntiCheat({ onViolation, enabled }: AntiCheatOptions) {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      onViolation('Tab switched or browser minimized');
    }
  }, [onViolation]);

  const handleBlur = useCallback(() => {
    // Some browsers trigger blur when clicking browser UI (address bar), 
    // but in a CBT context, we usually want to be strict.
    // However, some students might click accidentally.
    // Let's stick to visibilitychange for higher reliability (leaving the tab).
    // But we can add blur as a stricter option.
    // onViolation('Application window lost focus');
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Prevent right click
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);

    // Prevent print screen / shortcuts
    const preventShortcuts = (e: KeyboardEvent) => {
      // Ctrl+C, Ctrl+V, Ctrl+U, F12, etc.
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'p' || e.key === 's')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', preventShortcuts);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventShortcuts);
    };
  }, [enabled, handleVisibilityChange, handleBlur]);
}
