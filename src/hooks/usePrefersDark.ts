import { useEffect, useState } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return dark;
}
