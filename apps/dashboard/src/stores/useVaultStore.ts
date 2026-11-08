import { create } from 'zustand';

export interface VaultConnection {
  id: string;
  store: 'play' | 'apple' | 'revenuecat' | 'cloudflare' | 'netlify';
  label: string;
  createdAt: string;
}

interface VaultState {
  isUnlocked: boolean;
  passphrase: string | null;
  connections: VaultConnection[];
  unlock: (passphrase: string) => void;
  lock: () => void;
  addConnection: (connection: VaultConnection) => void;
  removeConnection: (id: string) => void;
  setConnections: (connections: VaultConnection[]) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  isUnlocked: false,
  passphrase: null,
  connections: [
    {
      id: 'conn_play_default',
      store: 'play',
      label: 'Google Play Service Account (Release)',
      createdAt: new Date().toISOString()
    }
  ],
  unlock: (passphrase) => set({ isUnlocked: true, passphrase }),
  lock: () => set({ isUnlocked: false, passphrase: null }),
  addConnection: (conn) =>
    set((s) => ({ connections: [...s.connections, conn] })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
  setConnections: (connections) => set({ connections })
}));
