import fs from 'node:fs';

/**
 * Resolves paths across Work (I:/H:) and Home (E:/G:) dual-mount environments.
 * Returns the first candidate path that physically exists on disk.
 */
export function resolveSovereignPath(candidates: string[]): string {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  // Fallback to the first candidate if none exist physically
  return candidates[0] || '';
}

export const SOVEREIGN_PATHS = {
  syncura: () => resolveSovereignPath([
    'I:\\Syncura',
    'H:\\My Drive\\.GENIEFLOW_MASTER\\03_APPS\\syncura',
    'G:\\My Drive\\.GENIEFLOW_MASTER\\03_APPS\\syncura',
    'E:\\Syncura'
  ]),
  sutraflow: () => resolveSovereignPath([
    'I:\\sutraflow',
    'H:\\My Drive\\.GENIEFLOW_MASTER\\03_APPS\\sutraflow',
    'E:\\sutraflow',
    'G:\\My Drive\\.GENIEFLOW_MASTER\\03_APPS\\sutraflow'
  ])
};

export function seedDefaultProjects(projects: Map<string, any>): void {
  projects.set('proj_syncura_official', {
    id: 'proj_syncura_official',
    ownerId: 'usr_default',
    name: 'Syncura',
    bundleId: 'health.syncura.app',
    sourceType: 'zip',
    sourceRef: SOVEREIGN_PATHS.syncura(),
    webDir: 'dist',
    status: 'configured',
    createdAt: new Date().toISOString()
  });

  projects.set('proj_sutraflow_official', {
    id: 'proj_sutraflow_official',
    ownerId: 'usr_default',
    name: 'SutraFlow Sovereign OS',
    bundleId: 'ai.genieflow.sutraflow',
    sourceType: 'zip',
    sourceRef: SOVEREIGN_PATHS.sutraflow(),
    webDir: 'dist',
    status: 'configured',
    createdAt: new Date().toISOString()
  });
}

