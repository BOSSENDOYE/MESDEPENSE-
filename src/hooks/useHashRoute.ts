import { useCallback, useEffect, useState } from 'react';

export type Route = 'accueil' | 'depenses' | 'budgets' | 'epargne' | 'reglages';

const ROUTES: readonly Route[] = ['accueil', 'depenses', 'budgets', 'epargne', 'reglages'];

function isRoute(value: string): value is Route {
  return (ROUTES as readonly string[]).includes(value);
}

function parseHash(hash: string): Route {
  const value = hash.replace(/^#\/?/, '');
  return isRoute(value) ? value : 'accueil';
}

/** Navigation par hash (#/depenses) : aucune configuration serveur nécessaire. */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `/${next}`;
  }, []);

  return [route, navigate];
}
