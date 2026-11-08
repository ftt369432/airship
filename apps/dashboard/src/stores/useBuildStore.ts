import { create } from 'zustand';

export type BuildState =
  | 'idle'
  | 'queued'
  | 'preparing'
  | 'building'
  | 'signing'
  | 'uploading'
  | 'submitted'
  | 'live'
  | 'failed';

export interface BuildLog {
  id: number;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'step';
  message: string;
}

interface BuildStoreState {
  platform: 'android' | 'ios';
  state: BuildState;
  logs: BuildLog[];
  artifactUrl: string | null;
  sha256: string | null;
  setPlatform: (platform: 'android' | 'ios') => void;
  setState: (state: BuildState) => void;
  appendLog: (level: 'info' | 'warn' | 'error' | 'step', message: string) => void;
  setArtifact: (url: string, sha256: string) => void;
  resetLogs: () => void;
}

export const useBuildStore = create<BuildStoreState>((set) => ({
  platform: 'android',
  state: 'idle',
  logs: [],
  artifactUrl: null,
  sha256: null,
  setPlatform: (platform) => set({ platform }),
  setState: (state) => set({ state }),
  appendLog: (level, message) =>
    set((s) => ({
      logs: [
        ...s.logs,
        {
          id: s.logs.length + 1,
          ts: new Date().toLocaleTimeString(),
          level,
          message
        }
      ]
    })),
  setArtifact: (url, sha256) => set({ artifactUrl: url, sha256 }),
  resetLogs: () => set({ logs: [], state: 'idle', artifactUrl: null, sha256: null })
}));
