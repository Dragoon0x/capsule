import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { detectCapabilities, type Capabilities } from '../features/capabilities/detect';
import { useCapsulesStore } from '../features/capsules/store';

const CapabilitiesCtx = createContext<Capabilities | null>(null);

export function useCapabilities(): Capabilities {
  const v = useContext(CapabilitiesCtx);
  if (!v) throw new Error('useCapabilities used outside CapabilitiesProvider');
  return v;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [caps] = useState<Capabilities>(() => detectCapabilities());
  const hydrate = useCapsulesStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <CapabilitiesCtx.Provider value={caps}>{children}</CapabilitiesCtx.Provider>;
}
