import { useEffect, useState } from 'react';

interface PersistApi {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
}

/**
 * true cuando la store persistida ya leyó su valor de disco. Va en un efecto:
 * en el render de servidor (web) no hay almacenamiento, así que ahí es false.
 */
export function useHydrated(store: { persist: PersistApi }): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(store.persist.hasHydrated());
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);
  return hydrated;
}
